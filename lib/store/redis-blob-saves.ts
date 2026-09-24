import { Redis } from '@upstash/redis';
import { GameTopicMessageType, GameStateUpdatedMessage, ReadyStateUpdatedMessage, GameTopicMessageBase } from "../message-types";
import { GameState, gameStateOptions, PlayerReadyState, PlayerActionsState, AllLocationsState, PlayerMessagesState, PlayerAddStatsState, PlayerInventoryState, StoreInventoryState, StoreBoardSettings, storeBoardDefaultSettings, ProcessingTurn } from "./types";
import { validateGameScope } from './savedGameTypes';
import { getGameKey, getPlayersReadyKey, publishGameStateUpdated, publishReadyStateUpdated } from './redis-access';

const redis = Redis.fromEnv();
const defaultLockTTL = 5000;

const singletonStateTypes = new Set(['game', 'playersReady', 'monsters', 'boardSettings', 'processingTurn']);
const entityStateTypes = new Set(['playerActions', 'npcActions', 'playerStats', 'playerInventory', 'playerMessages', 'store']);

function isGameStateKey(key: string, boardId: string, mapId: string): boolean {
  const separator = key.indexOf(':');
  const type = key.slice(0, separator);
  const keyScope = key.slice(separator + 1);
  const scope = `${boardId}:${mapId}`;
  return (singletonStateTypes.has(type) && keyScope === scope) ||
    (entityStateTypes.has(type) && keyScope.startsWith(`${scope}:`) && keyScope.length > scope.length + 1);
}

async function getGameStateKeys(boardId: string, mapId: string): Promise<string[]> {
  validateGameScope(boardId, mapId);
  const scope = `${boardId}:${mapId}`;
  const escapedScope = scope.replace(/[\\*?\[\]]/g, '\\$&');
  const keys = new Set<string>([getGameKey(boardId, mapId)]);
  let cursor = '0';
  do {
    const [nextCursor, batch] = await redis.scan(cursor, { match: `*:${escapedScope}*`, count: 100 });
    cursor = String(nextCursor);
    for (const key of batch) {
      if (isGameStateKey(key, boardId, mapId)) {
        keys.add(key);
      }
    }
  } while (cursor !== '0');
  return [...keys];
}

/** Capture persisted game data, including queues for entities no longer on the board. */
export async function getGameSnapshotFromRedis(boardId: string, mapId: string): Promise<{
  gameState: GameState;
  redisState: Record<string, unknown>;
}> {
  // One MGET reads all discovered values together; omit keys that have expired.
  const keyList = await getGameStateKeys(boardId, mapId);
  const values = await redis.mget<unknown[]>(...keyList);
  const gameState = values[0] as GameState | null;
  if (!gameState) {
    throw new Error('No game exists for this board and map');
  }
  const redisState = Object.fromEntries(
    keyList.flatMap((key, index) => values[index] === null ? [] : [[key, values[index]]])
  );
  return { gameState, redisState };
}

export async function restoreGameSnapshotInRedis(boardId: string, mapId: string, redisState: Record<string, Record<string, unknown>>): Promise<void> {
  validateGameScope(boardId, mapId);
  const entries = Object.entries(redisState);
  if (!Object.hasOwn(redisState, getGameKey(boardId, mapId)) ||
      entries.some(([key]) => !isGameStateKey(key, boardId, mapId))) {
    throw new Error('Saved game contains missing or invalid Redis keys');
  }
  const readyState = redisState[getPlayersReadyKey(boardId, mapId)] ?? { readyPlayerIds: [] };
  if (!Array.isArray(readyState.readyPlayerIds) || readyState.readyPlayerIds.some(id => typeof id !== 'string')) {
    throw new Error('Saved game contains invalid ready state');
  }
  const keys = await getGameStateKeys(boardId, mapId);
  // Replace rather than merge so actions and entities from the current game do not survive.
  const transaction = redis.multi();
  transaction.del(...keys);
  for (const [key, value] of entries) {
    transaction.set(key, value, gameStateOptions);
  }
  await transaction.exec();
  await publishGameStateUpdated(boardId, mapId);
  await publishReadyStateUpdated(boardId, mapId, readyState as unknown as PlayerReadyState);
}
