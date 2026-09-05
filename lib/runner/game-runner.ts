import {
  GameState,
  PlayerReadyState,
  AllLocationsState,
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
import { populateMonsters } from './populate-monsters';
import { levelUpPlayer, applyPlayerAddedStats } from './level-up';
import { applyPlayerInventory } from "./apply-inventory";

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
      monsters: locationsState.monsters,
      items: locationsState.items,
    });
  }
}

export async function processGameTurn(params: BaseParams): Promise<void> {
  try {
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
      const addedStats = await getPlayerStatsFromRedis(params.boardId, params.mapId, player.id);
      await applyPlayerAddedStats(params, player, addedStats);
      await applyPlayerInventory(params, player);
    }

    // Run the game turn
    await runGameTurn(params);

    for(const player of params.gameState.players) {
      levelUpPlayer(params, player);
    }

    // Update game state
    await setGameStateInRedis(params.boardId, params.mapId, params.gameState);

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

  // Store monsters
  const newLocationsState: AllLocationsState = {
    monsters: params.monsters,
    items: params.items,
  };
  setLocationsStateInRedis(params.boardId, params.mapId, newLocationsState);
}
