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
      levelUpPlayer(params, player);
      processPlayerEffects(params, player);
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

  processMonsterEffects(params);

  // Store monsters
  const newLocationsState: AllLocationsState = {
    monsters: params.monsters,
    items: params.items,
    coins: params.coins,
    stores: params.stores,
  };
  setLocationsStateInRedis(params.boardId, params.mapId, newLocationsState);
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
