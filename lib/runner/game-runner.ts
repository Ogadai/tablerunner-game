import {
  GameState,
  PlayerReadyState,
  AllLocationsState,
  ITarget,
  NPCState,
  MonsterState,
} from "../store/types";
import {
  getGameStateFromRedis,
  commitGameTurnInRedis,
  setReadyStateInRedis,
  getLocationsStateFromRedis,
  getPlayerStatsFromRedis,
  lockGameStateInRedis,
  publishGameProcessingStarted,
  publishGameProcessingFailed,
  publishGameStateUpdated,
  publishReadyStateUpdated,
  getReadyStateFromRedis,
  lockForProcessing,
  getProcessingTurnFromRedis,
  setProcessingTurnInRedis,
} from '../store/redis-access';
import { BaseParams } from './base-params';
import { runGameActions } from './game-actions';
import { levelUpPlayer, applyPlayerAddedStats } from './level-up';
import { applyPlayerInventory } from "./apply-inventory";
import { executeProcessesBetweenTurns, executeProcessesForTurn, initialiseProcessesForTurn } from "./game-processes";
import { populateMonsters } from "./populate-monsters";
import { updatePortalAndShopLeds } from "./game-action-portal";
import { updateMonsterLeds } from './game-action-monsters';

export async function checkAllPlayersReady(boardId: string, mapId: string, readyState: PlayerReadyState): Promise<void> {
  let gameStateLock: (() => Promise<void>) | null = null;
  let processingLock:  (() => Promise<void>) | null = null;
  let turnCompleted = false;
  try {
    processingLock = await lockForProcessing(boardId, mapId);
    gameStateLock = await lockGameStateInRedis(boardId, mapId);
    const gameState = await getGameStateFromRedis(boardId, mapId);

    turnCompleted = await processTurnIfReady(boardId, mapId, gameState, readyState);
  } finally {
    if (gameStateLock) {
      await gameStateLock();
    }
    if (processingLock) {
      await processingLock();
    }
  }

  if (turnCompleted) {
    // Clients can start between-turn processing as soon as they receive this update.
    // Release both locks first, and do not report a committed turn as failed if publishing fails.
    const notificationResults = await Promise.allSettled([
      publishReadyStateUpdated(boardId, mapId, { readyPlayerIds: [] }),
      publishGameStateUpdated(boardId, mapId),
    ]);
    for (const result of notificationResults) {
      if (result.status === 'rejected') {
        console.error('Failed to publish completed turn', result.reason);
      }
    }
  }
}

export async function runGameActionsBetweenTurns(boardId: string, mapId: string) {
  let processingLock:  (() => Promise<void>) | null = null;
  try {
    processingLock = await lockForProcessing(boardId, mapId);
    const processingTurn = await getProcessingTurnFromRedis(boardId, mapId)
    const gameState = await getGameStateFromRedis(boardId, mapId);

    if (processingTurn.turn === gameState.turn) {
      return;
    }

    await setProcessingTurnInRedis(boardId, mapId, { turn: gameState.turn })

    await executeProcessesBetweenTurns({
      boardId,
      mapId,
      gameState,
      messages: {},
      blockedMoves: [],
      coins: [],
      items: [],
      monsters: [],
      npcs: [],
    });
  } finally {
    if (processingLock) {
      await processingLock();
    }
  }

  const readyState = await getReadyStateFromRedis(boardId, mapId);
  await checkAllPlayersReady(boardId, mapId, readyState);
}

async function processTurnIfReady(boardId: string, mapId: string, gameState: GameState, readyState: PlayerReadyState): Promise<boolean> {
  if (gameState.players.every(player =>
    (player.health === 0) || readyState.readyPlayerIds.includes(player.id)
  )) {
    const locationsState = await getLocationsStateFromRedis(boardId, mapId);

    await processGameTurn({
      boardId,
      mapId,
      gameState,
      messages: {},
      ...locationsState
    });
    return true;
  }
  return false;
}

export async function processGameTurn(params: BaseParams): Promise<void> {
  try {
    await publishGameProcessingStarted(params.boardId, params.mapId);
    const originalStores = [...params.gameState.stores];

    if (params.monsters.length < 30) {
        const extraMonsters = await populateMonsters(params.gameState, params.gameState.players.length);
        params.monsters.push(...extraMonsters);
    }

    // Initialise the messages for each player
    for(const player of params.gameState.players) {
      params.messages[player.id] = { messages: []};
    }

    const newGameState: GameState = {
      ...params.gameState,
      turn: params.gameState.turn + 1,
      players: params.gameState.players.map(p => ({...p}))
    };
    params.gameState = newGameState;

    await initialiseProcessesForTurn(params);

    for(const player of params.gameState.players) {
      await applyPlayerInventory(params, player);
      const addedStats = await getPlayerStatsFromRedis(params.boardId, params.mapId, player.id);
      await applyPlayerAddedStats(params, player, addedStats);
    }

    // Run the game turn
    await runGameTurn(params);

    for(const player of params.gameState.players) {
      if (params.gameState.portals?.includes(player.location.id)) {
        if (!params.gameState.visitedPortals.includes(player.location.id)) {
          params.gameState.visitedPortals.push(player.location.id);
        }
      }
      levelUpPlayer(params, player);
    }

    updatePortalAndShopLeds(params.gameState);

    // Execute any other game processes
    await executeProcessesForTurn(params);
    updateMonsterLeds(params.gameState, params.monsters);

    const newLocationsState: AllLocationsState = {
      monsters: params.monsters,
      items: params.items,
      coins: params.coins,
      blockedMoves: params.blockedMoves,
      npcs: params.gameState.npcs,
    };
    await commitGameTurnInRedis(
      params.boardId, params.mapId, params.gameState, newLocationsState, params.messages,
      originalStores.filter(location => !params.gameState.stores.includes(location)),
    );
  } catch (error) {
    // Notify clients even if Redis is still unavailable during recovery.
    const recoveryResults = await Promise.allSettled([
      setReadyStateInRedis(params.boardId, params.mapId, { readyPlayerIds: [] }),
      publishGameProcessingFailed(params.boardId, params.mapId),
    ]);
    for (const result of recoveryResults) {
      if (result.status === 'rejected') {
        console.error('Failed to recover from turn processing error', result.reason);
      }
    }
    throw error;
  }
}

async function runGameTurn(params: BaseParams): Promise<void> {
  await runGameActions(params);

  processTargetEffects(params.gameState.players);
  processTargetEffects(params.gameState.npcs);
  processTargetEffects(params.monsters);

  processNpcTimeouts(params);
}

function processTargetEffects(targets: ITarget[]) {
  for(const target of targets) {
    if (target.effects) {
      target.effects = target.effects
        .map(({ turns, ...effect }) => ({ ...effect, turns: turns - 1 }))
        .filter(e => e.turns > 0);
    }
  }
}

function processNpcTimeouts(params: BaseParams) {
  const newNPCs: NPCState[] = [];
  for(const npc of params.gameState.npcs) {
    if (npc.turnsLeft && npc.turnsLeft > 0) {
      npc.turnsLeft--;
      if (npc.masterId) {
        const master = params.gameState.players.find(p => p.id === npc.masterId);
        if (master && master.health === 0) {
          npc.turnsLeft = 0;
        }
      }
      
      if (npc.turnsLeft > 0) {
        newNPCs.push(npc);
      } else {
        if (npc.expiryAction !== 'remove') {
          if (npc.monsterType) {
            const monster: MonsterState = {
              id: npc.id,
              type: npc.monsterType,
              location: npc.location.id,
              effects: [],
              health: (npc.expiryAction === 'dead') ? 0 : npc.health,
              zombie: npc.zombie,
            };

            params.monsters.push(monster);
          } else {
            npc.health = 0;
            newNPCs.push(npc);
          }
        }
      }
    } else {
      newNPCs.push(npc);
    }
  }

  params.gameState.npcs = newNPCs;
}
