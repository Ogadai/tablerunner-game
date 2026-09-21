import {
  GameState,
  PlayerReadyState,
  AllLocationsState,
  PlayerState,
  ITarget,
  NPCState,
  MonsterState,
} from "../store/types";
import {
  getGameStateFromRedis,
  setGameStateInRedis,
  setReadyStateInRedis,
  getLocationsStateFromRedis,
  setLocationsStateInRedis,
  setPlayerMessagesInRedis,
  setActionsStateInRedis,
  deleteNpcActionsStateFromRedis,
  setPlayerStatsInRedis,
  getPlayerStatsFromRedis,
  lockGameStateInRedis,
  publishGameProcessingStarted,
} from '../store/redis-access';
import { BaseParams } from './base-params';
import { runGameActions } from './game-actions';
import { levelUpPlayer, applyPlayerAddedStats } from './level-up';
import { applyPlayerInventory } from "./apply-inventory";
import { executeProcessesForTurn } from "./game-processes";
import { populateMonsters } from "./populate-monsters";
import { updatePortalAndShopLeds } from "./game-action-portal";
import { updateMonsterLeds } from './game-action-monsters';

export async function checkAllPlayersReady(boardId: string, mapId: string, readyState: PlayerReadyState): Promise<void> {
  let gameStateLock: (() => Promise<void>) | null = null;
  try {
    gameStateLock = await lockGameStateInRedis(boardId, mapId);
    const gameState = await getGameStateFromRedis(boardId, mapId);
    const locationsState = await getLocationsStateFromRedis(boardId, mapId);

    if (gameState.players.every(player =>
      (player.health === 0) || readyState.readyPlayerIds.includes(player.id)
    )) {
      await processGameTurn({
        boardId,
        mapId,
        gameState,
        messages: {},
        ...locationsState
      });
    }
  } finally {
    if (gameStateLock) {
      await gameStateLock();
    }
  }
}

export async function processGameTurn(params: BaseParams): Promise<void> {
  try {
    publishGameProcessingStarted(params.boardId, params.mapId);

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

    // Update game state
    await setGameStateInRedis(params.boardId, params.mapId, params.gameState);

    // Store monsters
    const newLocationsState: AllLocationsState = {
      monsters: params.monsters,
      items: params.items,
      coins: params.coins,
      blockedMoves: params.blockedMoves,
      npcs: params.gameState.npcs,
    };
    setLocationsStateInRedis(params.boardId, params.mapId, newLocationsState);

    // Reset ready state
    await setReadyStateInRedis(params.boardId, params.mapId, {
      readyPlayerIds: []
    });

    // Reset actions and set messages
    for(const player of params.gameState.players) {
      setActionsStateInRedis(params.boardId, params.mapId, player.id, {
        actions: []
      });

      setPlayerStatsInRedis(params.boardId, params.mapId, player.id, {
        characterStats: null
      });

      await setPlayerMessagesInRedis(params.boardId, params.mapId, player.id, params.messages[player.id]);
    }

    for(const npc of params.gameState.npcs) {
      if (npc.alignment === 'evil') {
        await deleteNpcActionsStateFromRedis(params.boardId, params.mapId, npc.id);
      }
    }
  } catch (error) {
    console.error(error);
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
