import { Redis } from '@upstash/redis';
import { GameTopicMessageType, GameStateUpdatedMessage, ReadyStateUpdatedMessage, GameTopicMessageBase } from "../message-types";
import { GameState, gameStateOptions, PlayerReadyState, PlayerActionsState, AllLocationsState, PlayerMessagesState, PlayerAddStatsState, PlayerInventoryState, StoreInventoryState, StoreBoardSettings, storeBoardDefaultSettings, ProcessingTurn, StorePlayerInstructions } from "./types";
import { publishMessage } from '../messages/message-publisher';
import { PlayerSnapshot, PlayerTurnInputs } from './types';

const redis = Redis.fromEnv();
const defaultLockTTL = 5000;
const defaultLockWaitMs = 1000;
const lockRetryIntervalMs = 50;
export const processingLockTTL = 30000;

export const getGameKey = (boardId: string, mapId: string) => `game:${boardId}:${mapId}`;
const getGameStateLock = (boardId: string, mapId: string) => `gameStateLock:${boardId}:${mapId}`;

export const getPlayersReadyKey = (boardId: string, mapId: string) => `playersReady:${boardId}:${mapId}`;
const getPlayersReadyLock = (boardId: string, mapId: string) => `playersReadyLock:${boardId}:${mapId}`;

const getPlayerActionsKey = (boardId: string, mapId: string, playerId: string) => `playerActions:${boardId}:${mapId}:${playerId}`;
const getPlayerActionsLock = (boardId: string, mapId: string, playerId: string) => `playerActionsLock:${boardId}:${mapId}:${playerId}`;
// Retain the legacy key so already queued boss actions survive the refactor.
const getMonsterActionsKey = (boardId: string, mapId: string, npcId: string) => `npcActions:${boardId}:${mapId}:${npcId}`;

const getPlayerStatsKey = (boardId: string, mapId: string, playerId: string) => `playerStats:${boardId}:${mapId}:${playerId}`;

const getPlayerInventoryKey = (boardId: string, mapId: string, playerId: string) => `playerInventory:${boardId}:${mapId}:${playerId}`;

const getPlayerMessagesKey = (boardId: string, mapId: string, playerId: string) => `playerMessages:${boardId}:${mapId}:${playerId}`;

const getLocationsKey = (boardId: string, mapId: string) => `monsters:${boardId}:${mapId}`;
const getLocationsLock = (boardId: string, mapId: string) => `monstersLock:${boardId}:${mapId}`;

const getStoreInventoryKey = (boardId: string, mapId: string, location: number) => `store:${boardId}:${mapId}:${location}`;
const getStoreInventoryLock = (boardId: string, mapId: string) => `storeLock:${boardId}:${mapId}`;

const getPlayerInstructionsKey = (boardId: string, mapId: string, playerId: string) => `playerInstructions:${boardId}:${mapId}:${playerId}`;

const getBoardSettingsKey = (boardId: string, mapId: string) => `boardSettings:${boardId}:${mapId}`;

const getProcessingKey = (boardId: string, mapId: string) => `processingTurn:${boardId}:${mapId}`;
const getProcessingLock = (boardId: string, mapId: string) => `processingLock:${boardId}:${mapId}`;

/* Overall Game State */

export async function getGameStateFromRedis(boardId: string, mapId: string): Promise<GameState> {
  return await redis.get(getGameKey(boardId, mapId)) as GameState;
}

export async function getPlayerSnapshotFromRedis(boardId: string, mapId: string, playerId: string): Promise<PlayerSnapshot> {
  // Read the game and pending inputs together so a turn commit cannot split the snapshot.
  const [gameState, inventory, actions, addedStats, locations, messages, instructions] = await redis.mget<[
    GameState | null, PlayerInventoryState | null, PlayerActionsState | null,
    PlayerAddStatsState | null, AllLocationsState | null, PlayerMessagesState | null,
    StorePlayerInstructions | null
  ]>(
    getGameKey(boardId, mapId),
    getPlayerInventoryKey(boardId, mapId, playerId),
    getPlayerActionsKey(boardId, mapId, playerId),
    getPlayerStatsKey(boardId, mapId, playerId),
    getLocationsKey(boardId, mapId),
    getPlayerMessagesKey(boardId, mapId, playerId),
    getPlayerInstructionsKey(boardId, mapId, playerId),
  );
  const locationId = gameState?.players.find(player => player.id === playerId)?.location.id;

  return {
    playerId,
    gameState,
    inventory: inventory || { equipped: null, equipment: null, hiredNpcIds: [] },
    actions: actions || { actions: [] },
    addedStats: addedStats || { characterStats: null },
    location: {
      monsters: locations?.monsters.filter(monster => monster.location === locationId) || [],
      items: locations?.items.filter(item => item.location === locationId) || [],
      npcs: locations?.npcs?.filter(npc => npc.location.id === locationId) || [],
    },
    messages: messages || { messages: [] },
    instructions: instructions || {},
  };
}

export async function setGameStateInRedis(boardId: string, mapId: string, newGameState: GameState, { notify = true }: { notify?: boolean } = {}): Promise<void> {
  await redis.set(getGameKey(boardId, mapId), newGameState, gameStateOptions);
  if (notify) {
    await publishGameStateUpdated(boardId, mapId);
  }
}

// Save cooldown resets and respawns without consuming other pending turn inputs.
export async function commitPausedGameInRedis(
  boardId: string,
  mapId: string,
  gameState: GameState,
  respawnedPlayerIds: string[],
): Promise<void> {
  const transaction = redis.multi();
  transaction.set(getGameKey(boardId, mapId), gameState, gameStateOptions);
  transaction.set(getPlayersReadyKey(boardId, mapId), { readyPlayerIds: [] }, gameStateOptions);
  for (const playerId of respawnedPlayerIds) {
    transaction.set(getPlayerActionsKey(boardId, mapId, playerId), { actions: [] }, gameStateOptions);
  }
  await transaction.exec();
}

// Save the entire turn before consuming any of its pending inputs or notifying clients.
export async function commitGameTurnInRedis(
  boardId: string,
  mapId: string,
  gameState: GameState,
  locationsState: AllLocationsState,
  messages: Record<string, PlayerMessagesState>,
  removedStoreLocations: number[],
  consumedNpcInventoryIds: string[] = gameState.npcs.map(npc => npc.id),
): Promise<void> {
  const transaction = redis.multi();
  transaction.set(getGameKey(boardId, mapId), gameState, gameStateOptions);
  transaction.set(getLocationsKey(boardId, mapId), locationsState, gameStateOptions);
  transaction.set(getPlayersReadyKey(boardId, mapId), { readyPlayerIds: [] }, gameStateOptions);

  for (const player of gameState.players) {
    transaction.del(getPlayerInventoryKey(boardId, mapId, player.id));
    transaction.set(getPlayerActionsKey(boardId, mapId, player.id), { actions: [] }, gameStateOptions);
    transaction.set(getPlayerStatsKey(boardId, mapId, player.id), { characterStats: null }, gameStateOptions);
    transaction.set(getPlayerMessagesKey(boardId, mapId, player.id), messages[player.id], gameStateOptions);
    transaction.del(getPlayerInstructionsKey(boardId, mapId, player.id));
  }

  for (const monster of locationsState.monsters.filter(m => m.scriptedActions)) {
    transaction.del(getMonsterActionsKey(boardId, mapId, monster.id));
  }
  for (const npcId of consumedNpcInventoryIds) {
    transaction.del(getPlayerInventoryKey(boardId, mapId, npcId));
  }
  for (const location of removedStoreLocations) {
    transaction.del(getStoreInventoryKey(boardId, mapId, location));
  }

  await transaction.exec();
}

export async function lockGameStateInRedis(boardId: string, mapId: string, ttl = defaultLockTTL, waitMs = defaultLockWaitMs): Promise<() => Promise<void>> {
  return getLock(getGameStateLock(boardId, mapId), ttl, waitMs);
}

export async function deleteGameStateFromRedis(boardId: string, mapId: string): Promise<void> {
  const gameState = await redis.get(getGameKey(boardId, mapId)) as GameState;

  if (gameState) {
    // Delete data from Redis
    await redis.del(getGameKey(boardId, mapId));

    // Also delete any related game state in Redis
    await deleteReadyStateFromRedis(boardId, mapId);

    for(const player of gameState.players) {
      await deleteActionsStateFromRedis(boardId, mapId, player.id);
      await deletePlayerMessagesFromRedis(boardId, mapId, player.id);
      await deletePlayerStatsFromRedis(boardId, mapId, player.id);
      await deletePlayerInventoryFromRedis(boardId, mapId, player.id);
      await deletePlayerInstructionsFromRedis(boardId, mapId, player.id);
    }

    for(const storeLocation of gameState.stores) {
      deleteStoreStateFromRedis(boardId, mapId, storeLocation);
    }

    const locations = await getLocationsStateFromRedis(boardId, mapId);
    for (const npcId of new Set([...gameState.npcs, ...locations.npcs].map(npc => npc.id))) {
      await deletePlayerInventoryFromRedis(boardId, mapId, npcId);
    }
    for (const monster of locations.monsters.filter(m => m.scriptedActions)) {
      await deleteMonsterActionsStateFromRedis(boardId, mapId, monster.id);
      await deletePlayerMessagesFromRedis(boardId, mapId, monster.id);
    }

    // Delete the monsters state from Redis
    await deleteLocationsStateFromRedis(boardId, mapId);
    await deleteProcessingTurnFromRedis(boardId, mapId);

    await publishGameStateUpdated(boardId, mapId);
  }
}

export async function publishGameStateUpdated(boardId: string, mapId: string): Promise<void> {
  const msg: GameStateUpdatedMessage = {
    type: GameTopicMessageType.GameStateUpdated
  };
  await publishMessage(boardId, mapId, msg);
}

export async function publishGameProcessingStarted(boardId: string, mapId: string): Promise<void> {
  const msg: GameTopicMessageBase = {
    type: GameTopicMessageType.GameProcessingStarted
  };
  await publishMessage(boardId, mapId, msg);
}

export async function publishGameProcessingFailed(boardId: string, mapId: string): Promise<void> {
  await publishMessage(boardId, mapId, { type: GameTopicMessageType.GameProcessingFailed });
}

/* All Players "Ready" State */

export async function lockReadyStateInRedis(boardId: string, mapId: string, waitMs = defaultLockWaitMs): Promise<() => Promise<void>> {
  return getLock(getPlayersReadyLock(boardId, mapId), defaultLockTTL, waitMs);
}

export async function getReadyStateFromRedis(boardId: string, mapId: string): Promise<PlayerReadyState> {
  const result = await redis.get(getPlayersReadyKey(boardId, mapId)) as PlayerReadyState;
  return result || {
    readyPlayerIds: []
  };
}

export async function setReadyStateInRedis(boardId: string, mapId: string, newReadyState: PlayerReadyState, { notify = true }: { notify?: boolean } = {}): Promise<void> {
  await redis.set(getPlayersReadyKey(boardId, mapId), newReadyState, gameStateOptions);
  if (notify) {
    await publishReadyStateUpdated(boardId, mapId, newReadyState);
  }
}

export async function deleteReadyStateFromRedis(boardId: string, mapId: string): Promise<void> {
  // Delete data from Redis
  await redis.del(getPlayersReadyKey(boardId, mapId));
}

export async function publishReadyStateUpdated(boardId: string, mapId: string, newReadyState: PlayerReadyState): Promise<void> {
  const msg: ReadyStateUpdatedMessage = {
    type: GameTopicMessageType.ReadyStateUpdated,
    readyPlayerIds: newReadyState.readyPlayerIds,
    readyPlayerDirection: newReadyState.readyPlayerDirection
  };
  await publishMessage(boardId, mapId, msg);
}

/* Pending inputs for all players in a turn */

export async function getPlayerTurnInputsFromRedis(
  boardId: string,
  mapId: string,
  playerIds: string[],
): Promise<Record<string, PlayerTurnInputs>> {
  if (playerIds.length === 0) return {};

  const keys = playerIds.flatMap(playerId => [
    getPlayerInventoryKey(boardId, mapId, playerId),
    getPlayerStatsKey(boardId, mapId, playerId),
    getPlayerActionsKey(boardId, mapId, playerId),
    getPlayerInstructionsKey(boardId, mapId, playerId),
  ]);
  const results = await redis.mget<(PlayerInventoryState | PlayerAddStatsState | PlayerActionsState | StorePlayerInstructions | null)[]>(...keys);

  return Object.fromEntries(playerIds.map((playerId, index) => {
    const offset = index * 4;
    return [playerId, {
      inventory: (results[offset] as PlayerInventoryState | null) || { equipped: null, equipment: null, hiredNpcIds: [] },
      addedStats: (results[offset + 1] as PlayerAddStatsState | null) || { characterStats: null },
      actions: (results[offset + 2] as PlayerActionsState | null) || { actions: [] },
      instructions: (results[offset + 3] as StorePlayerInstructions | null) || {},
    }];
  }));
}

/* Individual Player Actions State */

export async function lockPlayerActionsInRedis(boardId: string, mapId: string, playerId: string, ttl = defaultLockTTL, waitMs = defaultLockWaitMs): Promise<() => Promise<void>> {
  return getLock(getPlayerActionsLock(boardId, mapId, playerId), ttl, waitMs);
}

export async function getActionsStateFromRedis(boardId: string, mapId: string, playerId: string): Promise<PlayerActionsState> {
  const result = await redis.get(getPlayerActionsKey(boardId, mapId, playerId)) as PlayerActionsState;
  return result || { actions: [] };
}

export async function setActionsStateInRedis(boardId: string, mapId: string, playerId: string, newActionsState: PlayerActionsState): Promise<void> {
  await redis.set(getPlayerActionsKey(boardId, mapId, playerId), newActionsState, gameStateOptions);
}

export async function deleteActionsStateFromRedis(boardId: string, mapId: string, playerId: string): Promise<void> {
  await redis.del(getPlayerActionsKey(boardId, mapId, playerId));
}

/* Scripted Monster Actions State */

export async function getMonsterActionsStateFromRedis(boardId: string, mapId: string, npcId: string): Promise<PlayerActionsState | null> {
  const result = await redis.get(getMonsterActionsKey(boardId, mapId, npcId)) as PlayerActionsState;
  return result || null;
}

export async function setMonsterActionsStateInRedis(boardId: string, mapId: string, npcId: string, newActionsState: PlayerActionsState): Promise<void> {
  await redis.set(getMonsterActionsKey(boardId, mapId, npcId), newActionsState, gameStateOptions);
}

export async function deleteMonsterActionsStateFromRedis(boardId: string, mapId: string, npcId: string): Promise<void> {
  await redis.del(getMonsterActionsKey(boardId, mapId, npcId));
}

/* Individual Player Stat additions */

export async function getPlayerStatsFromRedis(boardId: string, mapId: string, playerId: string): Promise<PlayerAddStatsState> {
  const result = await redis.get(getPlayerStatsKey(boardId, mapId, playerId)) as PlayerAddStatsState;
  return result || { characterStats: null };
}

export async function setPlayerStatsInRedis(boardId: string, mapId: string, playerId: string, newActionsState: PlayerAddStatsState): Promise<void> {
  await redis.set(getPlayerStatsKey(boardId, mapId, playerId), newActionsState, gameStateOptions);
}

export async function deletePlayerStatsFromRedis(boardId: string, mapId: string, playerId: string): Promise<void> {
  await redis.del(getPlayerStatsKey(boardId, mapId, playerId));
}

/* Individual Player Inventory Changes */

// NPCs use the same pending inventory format and keys as players.
export async function getCharacterInventoriesFromRedis(
  boardId: string, mapId: string, characterIds: string[],
): Promise<Record<string, PlayerInventoryState>> {
  if (characterIds.length === 0) return {};
  const inventories = await redis.mget<(PlayerInventoryState | null)[]>(
    ...characterIds.map(id => getPlayerInventoryKey(boardId, mapId, id)),
  );
  return Object.fromEntries(characterIds.map((id, index) => [
    id, inventories[index] || { equipped: null, equipment: null },
  ]));
}

export async function setCharacterInventoriesInRedis(
  boardId: string, mapId: string, inventories: Record<string, PlayerInventoryState>,
): Promise<void> {
  const transaction = redis.multi();
  for (const [id, inventory] of Object.entries(inventories)) {
    transaction.set(getPlayerInventoryKey(boardId, mapId, id), inventory, gameStateOptions);
  }
  await transaction.exec();
}

export async function getPlayerInventoryFromRedis(boardId: string, mapId: string, playerId: string): Promise<PlayerInventoryState> {
  const result = await redis.get(getPlayerInventoryKey(boardId, mapId, playerId)) as PlayerInventoryState;
  return result || { equipped: null, equipment: null, hiredNpcIds: [] };
}

export async function setPlayerInventoryInRedis(boardId: string, mapId: string, playerId: string, newInventoryState: PlayerInventoryState): Promise<void> {
  await redis.set(getPlayerInventoryKey(boardId, mapId, playerId), newInventoryState, gameStateOptions);
}

export async function deletePlayerInventoryFromRedis(boardId: string, mapId: string, playerId: string): Promise<void> {
  await redis.del(getPlayerInventoryKey(boardId, mapId, playerId));
}

/* Individual Player Message List */

export async function getPlayerMessagesFromRedis(boardId: string, mapId: string, playerId: string): Promise<PlayerMessagesState> {
  const result = await redis.get(getPlayerMessagesKey(boardId, mapId, playerId)) as PlayerMessagesState;
  return result || { messages: [] };
}

export async function setPlayerMessagesInRedis(boardId: string, mapId: string, playerId: string, newMessagesState: PlayerMessagesState): Promise<void> {
  await redis.set(getPlayerMessagesKey(boardId, mapId, playerId), newMessagesState, gameStateOptions);
}

export async function deletePlayerMessagesFromRedis(boardId: string, mapId: string, playerId: string): Promise<void> {
  await redis.del(getPlayerMessagesKey(boardId, mapId, playerId));
}

/* Locations State */

export async function lockLocationsStateInRedis(boardId: string, mapId: string, waitMs = defaultLockWaitMs): Promise<() => Promise<void>> {
  return getLock(getLocationsLock(boardId, mapId), defaultLockTTL, waitMs);
}

export async function getLocationsStateFromRedis(boardId: string, mapId: string): Promise<AllLocationsState> {
  const result = await redis.get(getLocationsKey(boardId, mapId)) as AllLocationsState;
  return result || { monsters: [], items: [], coins: [], blockedMoves: [], npcs: [] };
}

export async function setLocationsStateInRedis(boardId: string, mapId: string, monsterState: AllLocationsState): Promise<void> {
  await redis.set(getLocationsKey(boardId, mapId), monsterState, gameStateOptions);
}

export async function deleteLocationsStateFromRedis(boardId: string, mapId: string): Promise<void> {
  await redis.del(getLocationsKey(boardId, mapId));
}


/* Store inventory state */

export async function lockStoreStateInRedis(boardId: string, mapId: string, waitMs = defaultLockWaitMs): Promise<() => Promise<void>> {
  return getLock(getStoreInventoryLock(boardId, mapId), defaultLockTTL, waitMs);
}

export async function getStoreStateFromRedis(boardId: string, mapId: string, location: number): Promise<StoreInventoryState> {
  const result = await redis.get(getStoreInventoryKey(boardId, mapId, location)) as StoreInventoryState;
  return result || { items: [] };
}

export async function setStoreStateInRedis(boardId: string, mapId: string, location: number, storeState: StoreInventoryState): Promise<void> {
  await redis.set(getStoreInventoryKey(boardId, mapId, location), storeState, gameStateOptions);
}

export async function deleteStoreStateFromRedis(boardId: string, mapId: string, location: number): Promise<void> {
  await redis.del(getStoreInventoryKey(boardId, mapId, location));
}

/* Player instructions (depends on game) */

export async function getPlayerInstructionsFromRedis(boardId: string, mapId: string, playerId: string): Promise<StorePlayerInstructions> {
  const result = await redis.get(getPlayerInstructionsKey(boardId, mapId, playerId)) as StorePlayerInstructions;
  return result || {};
}

export async function setPlayerInstructionsInRedis(boardId: string, mapId: string, playerId: string, newInstructions: StorePlayerInstructions): Promise<void> {
  await redis.set(getPlayerInstructionsKey(boardId, mapId, playerId), newInstructions, gameStateOptions);
}

export async function deletePlayerInstructionsFromRedis(boardId: string, mapId: string, playerId: string): Promise<void> {
  await redis.del(getPlayerInstructionsKey(boardId, mapId, playerId));
}

/* Board Setting */

export async function getBoardSettingsFromRedis(boardId: string, mapId: string): Promise<StoreBoardSettings> {
  const result = await redis.get(getBoardSettingsKey(boardId, mapId)) as StoreBoardSettings;
  return result || storeBoardDefaultSettings;
}

export async function setBoardSettingsFromRedis(boardId: string, mapId: string, storeState: StoreBoardSettings): Promise<void> {
  await redis.set(getBoardSettingsKey(boardId, mapId), storeState, gameStateOptions);
}

/* Locking for processing */

export async function lockForProcessing(boardId: string, mapId: string): Promise<() => Promise<void>> {
  return getLock(getProcessingLock(boardId, mapId), processingLockTTL);
}

export async function getProcessingTurnFromRedis(boardId: string, mapId: string): Promise<ProcessingTurn> {
  const result = await redis.get(getProcessingKey(boardId, mapId)) as ProcessingTurn;
  return result || { turn: 0 };
}

export async function setProcessingTurnInRedis(boardId: string, mapId: string, monsterState: ProcessingTurn): Promise<void> {
  await redis.set(getProcessingKey(boardId, mapId), monsterState, gameStateOptions);
}

export async function deleteProcessingTurnFromRedis(boardId: string, mapId: string): Promise<void> {
  await redis.del(getProcessingKey(boardId, mapId));
}

/* Generic locking */

export class RedisLockError extends Error {
  constructor() {
    super('Failed to acquire lock');
    this.name = 'RedisLockError';
  }
}

// Retry contention only; Redis errors propagate immediately. A zero wait is fail-fast.
async function getLock(lockKey: string, ttl: number = defaultLockTTL, waitMs = 0): Promise<() => Promise<void>> {
  const lockValue = crypto.randomUUID(); // Unique token to identify the lock owner
  const deadline = Date.now() + waitMs;

  // 'NX' ensures it only sets if the key doesn't exist
  // 'PX' sets the expiration time in milliseconds
  let acquired;
  do {
    acquired = await redis.set(lockKey, lockValue, {
      nx: true,
      px: ttl,
    });
    if (acquired === "OK") break;
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) throw new RedisLockError();
    await new Promise<void>(resolve => setTimeout(resolve, Math.min(lockRetryIntervalMs, remainingMs)));
    if (Date.now() >= deadline) throw new RedisLockError();
  } while (true);

  if (acquired === "OK") {
    return async () => {
      try {
        // Atomic release using Lua script
        const luaReleaseScript = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `;
        
        // Execution syntax varies slightly by client (e.g., redis.eval or redis.evalsha)
        await redis.eval(luaReleaseScript, [lockKey], [lockValue]);
      } catch (ex) {
        console.error('Error occurred releasing redis lock', ex);
      }
    }
  }
  throw new RedisLockError();
}

