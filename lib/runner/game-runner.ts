import {
  GameState,
  PlayerReadyState,
  AllLocationsState,
  ITarget,
  NPCState,
  MonsterState,
  PlayerActionType,
  PlayerActionsState,
} from "../store/types";
import {
  getGameStateFromRedis,
  commitGameTurnInRedis,
  commitPausedGameInRedis,
  getActionsStateFromRedis,
  setReadyStateInRedis,
  getLocationsStateFromRedis,
  getPlayerTurnInputsFromRedis,
  lockGameStateInRedis,
  lockReadyStateInRedis,
  publishGameProcessingStarted,
  publishGameProcessingFailed,
  publishGameStateUpdated,
  publishReadyStateUpdated,
  getReadyStateFromRedis,
  lockForProcessing,
  getProcessingTurnFromRedis,
  setProcessingTurnInRedis,
  processingLockTTL,
  RedisLockError,
} from '../store/redis-access';
import { BaseParams } from './base-params';
import { runGameActions } from './game-actions';
import { levelUpPlayer, applyPlayerAddedStats } from './level-up';
import { applyPlayerInventory } from "./apply-inventory";
import { executeProcessesBetweenTurns, executeProcessesForTurn, initialiseProcessesForTurn } from "./game-processes";
import { populateMonsters } from "./populate-monsters";
import { updatePortalAndShopLeds } from "./game-action-portal";
import { updateMonsterLeds } from './game-action-monsters';
import { actionRespawn } from './game-action-move';

export async function checkAllPlayersReady(boardId: string, mapId: string): Promise<void> {
  let gameStateLock: (() => Promise<void>) | null = null;
  let processingLock:  (() => Promise<void>) | null = null;
  let readyLock: (() => Promise<void>) | null = null;
  let gameStateUpdated = false;
  let turnFailed = false;
  let pendingNotification: Promise<void> | undefined;
  try {
    try {
      processingLock = await lockForProcessing(boardId, mapId);
    } catch (error) {
      if (error instanceof RedisLockError) {
        // Between-turn processing checks readiness again when its NPC actions are saved.
        return;
      }
      throw error;
    }
    // Inventory writes must also stay excluded for the full turn-processing window.
    gameStateLock = await lockGameStateInRedis(boardId, mapId, processingLockTTL);
    const gameState = await getGameStateFromRedis(boardId, mapId);
    if (!gameState) return;

    readyLock = await lockReadyStateInRedis(boardId, mapId);
    const readyState = await getReadyStateFromRedis(boardId, mapId);

    if (gameState.players.every(player => player.health <= 0)) {
      gameStateUpdated = await processPausedGame(boardId, mapId, gameState, readyState);
    } else if (gameState.players.every(player => player.health === 0 || readyState.readyPlayerIds.includes(player.id))) {
      // Do not hold the short readiness lock during turn execution.
      await readyLock();
      readyLock = null;
      const locationsState = await getLocationsStateFromRedis(boardId, mapId);
      pendingNotification = notifyProcessingStarted(boardId, mapId);
      try {
        await processGameTurn({ boardId, mapId, gameState, messages: {}, ...locationsState });
        gameStateUpdated = true;
      } catch (error) {
        turnFailed = true;
        throw error;
      }
    }
  } finally {
    if (gameStateLock) {
      await gameStateLock();
    }
    // Overlap delivery with execution, then release the state lock before waiting.
    // Keep processing serialized until start settles so it cannot arrive after a
    // later turn's completion. Failure/completion notifications follow unlock.
    await pendingNotification;
    if (processingLock) {
      await processingLock();
    }
    if (readyLock) {
      // On a not-ready snapshot, release processing first so a new ready update
      // cannot be accepted and then deferred to a check that has already finished.
      await readyLock();
    }

    if (turnFailed) {
      const notificationResults = await Promise.allSettled([
        publishReadyStateUpdated(boardId, mapId, { readyPlayerIds: [] }),
        publishGameProcessingFailed(boardId, mapId),
      ]);
      for (const result of notificationResults) {
        if (result.status === 'rejected') {
          console.error('Failed to publish turn processing failure', result.reason);
        }
      }
    }
  }

  if (gameStateUpdated) {
    // Clients can start between-turn processing as soon as they receive this update.
    // Release locks first, and do not report a committed update as failed if publishing fails.
    const notificationResults = await Promise.allSettled([
      publishReadyStateUpdated(boardId, mapId, { readyPlayerIds: [] }),
      publishGameStateUpdated(boardId, mapId),
    ]);
    for (const result of notificationResults) {
      if (result.status === 'rejected') {
        console.error('Failed to publish game update', result.reason);
      }
    }
  }
}

async function notifyProcessingStarted(boardId: string, mapId: string): Promise<void> {
  try {
    await publishGameProcessingStarted(boardId, mapId);
  } catch (error) {
    console.error('Failed to publish turn processing start', error);
  }
}

export async function runGameActionsBetweenTurns(boardId: string, mapId: string) {
  let processingLock:  (() => Promise<void>) | null = null;
  try {
    processingLock = await lockForProcessing(boardId, mapId);
    const processingTurn = await getProcessingTurnFromRedis(boardId, mapId)
    const gameState = await getGameStateFromRedis(boardId, mapId);

    if (gameState && gameState.players && gameState.players.some(player => player.health > 0) && processingTurn.turn !== gameState.turn) {
      await setProcessingTurnInRedis(boardId, mapId, { turn: gameState.turn });

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
    }
  } finally {
    if (processingLock) {
      await processingLock();
    }
  }

  // Also check after duplicate requests: readiness may have changed while this lock was held.
  await checkAllPlayersReady(boardId, mapId);
}

async function processPausedGame(boardId: string, mapId: string, gameState: GameState, readyState: PlayerReadyState): Promise<boolean> {
  let changed = readyState.readyPlayerIds.length > 0;
  const respawnedPlayerIds: string[] = [];
  for (const player of gameState.players) {
    changed ||= player.respawnTurns !== 0;
    player.respawnTurns = 0;
    if (!readyState.readyPlayerIds.includes(player.id)) continue;

    const actionsState = await getActionsStateFromRedis(boardId, mapId, player.id);
    if (actionsState.actions.some(action => action.type === PlayerActionType.Respawn)) {
      const locationsState = await getLocationsStateFromRedis(boardId, mapId);
      actionRespawn({ boardId, mapId, gameState, messages: {}, ...locationsState }, player);
      respawnedPlayerIds.push(player.id);
    }
  }
  if (changed) {
    await commitPausedGameInRedis(boardId, mapId, gameState, respawnedPlayerIds);
  }
  return changed;
}

export async function processGameTurn(params: BaseParams): Promise<void> {
  try {
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

    const playerInputs = await getPlayerTurnInputsFromRedis(
      params.boardId, params.mapId, params.gameState.players.map(player => player.id),
    );
    const playerActions: Record<string, PlayerActionsState> = {};
    for(const player of params.gameState.players) {
      const { inventory, addedStats, actions } = playerInputs[player.id];
      await applyPlayerInventory(params, player, inventory);
      await applyPlayerAddedStats(params, player, addedStats);
      playerActions[player.id] = actions;
    }

    // Run the game turn
    await runGameTurn(params, playerActions);

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

    if (params.gameState.players.every(player => player.health <= 0)) {
      for (const player of params.gameState.players) {
        player.respawnTurns = 0;
      }
    }

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
    // Recover state under the lock; the caller notifies after releasing it.
    try {
      await setReadyStateInRedis(params.boardId, params.mapId, { readyPlayerIds: [] }, { notify: false });
    } catch (recoveryError) {
      console.error('Failed to recover from turn processing error', recoveryError);
    }
    throw error;
  }
}

async function runGameTurn(params: BaseParams, playerActions: Record<string, PlayerActionsState>): Promise<void> {
  await runGameActions(params, playerActions);

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
              team: 'monster',
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
