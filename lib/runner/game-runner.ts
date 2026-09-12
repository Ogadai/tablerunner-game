import {
  GameState,
  PlayerReadyState,
  AllLocationsState,
  PlayerState,
} from "../store/types";
import {
  getGameStateFromRedis,
  setGameStateInRedis,
  setReadyStateInRedis,
  getLocationsStateFromRedis,
  setLocationsStateInRedis,
  setPlayerMessagesInRedis,
  setActionsStateInRedis,
  setPlayerStatsInRedis,
  getPlayerStatsFromRedis,
} from '../store/redis-access';
import { BaseParams } from './base-params';
import { runGameActions } from './game-actions';
import { levelUpPlayer, applyPlayerAddedStats } from './level-up';
import { applyPlayerInventory } from "./apply-inventory";
import { executeProcessesForTurn } from "./game-processes";
import { populateMonsters } from "./populate-monsters";
import { updatePortalLeds } from "./game-action-portal";

export async function checkAllPlayersReady(boardId: string, mapId: string, readyState: PlayerReadyState): Promise<void> {
  const gameState = await getGameStateFromRedis(boardId, mapId);
  const locationsState = await getLocationsStateFromRedis(boardId, mapId);;

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
}

export async function processGameTurn(params: BaseParams): Promise<void> {
  try {
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
      processPlayerEffects(params, player);
    }

    updatePortalLeds(params.gameState);

    // Execute any other game processes
    await executeProcessesForTurn(params);

    // Update game state
    await setGameStateInRedis(params.boardId, params.mapId, params.gameState);

    // Store monsters
    const newLocationsState: AllLocationsState = {
      monsters: params.monsters,
      items: params.items,
      coins: params.coins,
      blockedMoves: params.blockedMoves,
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
  } catch (error) {
    console.error(error);
  }
}

async function runGameTurn(params: BaseParams): Promise<void> {
  await runGameActions(params);

  processMonsterEffects(params);
}

export function processPlayerEffects(params: BaseParams, player: PlayerState) {
  if (player.effects) {
    player.effects = player.effects!
      .map(({ turns, ...effect }) => ({ ...effect, turns: turns - 1 }))
      .filter(e => e.turns > 0);
  }
}

export function processMonsterEffects(params: BaseParams) {
  params.monsters = params.monsters.map(monster => ({
    ...monster,
    effects: monster.effects
      ?.map(({ turns, ...effect }) => ({ ...effect, turns: turns - 1 }))
      .filter(effect => effect.turns > 0),
  }));
}
