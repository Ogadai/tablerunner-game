import {
  GameState,
  PlayerReadyState,
  AllMonsterState,
} from "../store/types";
import {
  getGameStateFromRedis,
  setGameStateInRedis,
  setReadyStateInRedis,
  getMonstersStateFromRedis,
  setMonstersStateInRedis,
  setPlayerMessagesInRedis,
  setActionsStateInRedis,
} from '../store/redis-access';
import { BaseParams } from './base-params';
import { runGameActions } from './game-actions';
import { populateMonsters } from './populate-monsters';

export async function checkAllPlayersReady(boardId: string, mapId: string, readyState: PlayerReadyState): Promise<void> {
  const gameState = await getGameStateFromRedis(boardId, mapId);
  const monsterState = await getMonsterState(boardId, mapId);

  if (gameState.players.every(player =>
    (player.health === 0) || readyState.readyPlayerIds.includes(player.id)
  )) {
    await processGameTurn({
      boardId,
      mapId,
      gameState,
      messages: {},
      monsters: monsterState.monsters
    });
  }
}

export async function processGameTurn(params: BaseParams): Promise<void> {
  try {
    // Initialise the messages for each player
    for(const player of params.gameState.players) {
      params.messages[player.id] = { messages: []};
    }

    // Run the game turn
    const newGameState = await runGameTurn(params);

    // Update game state
    await setGameStateInRedis(params.boardId, params.mapId, newGameState);

    // Reset ready state
    await setReadyStateInRedis(params.boardId, params.mapId, {
      readyPlayerIds: []
    });

    // Reset actions and set messages
    for(const player of newGameState.players) {
      setActionsStateInRedis(params.boardId, params.mapId, player.id, {
        actions: []
      });

      await setPlayerMessagesInRedis(params.boardId, params.mapId, player.id, params.messages[player.id]);
    }
  } catch (error) {
    console.error(error);
  }
}

async function runGameTurn(params: BaseParams): Promise<GameState> {
  const newGameState: GameState = {
    ...params.gameState,
    players: params.gameState.players.map(p => ({...p}))
  };
  params.gameState = newGameState;


  await runGameActions(params);

  // Store monsters
  const newMonsterState: AllMonsterState = {
    monsters: params.monsters
  };
  setMonstersStateInRedis(params.boardId, params.mapId, newMonsterState);

  return newGameState;
}

async function getMonsterState(boardId: string, mapId: string): Promise<AllMonsterState> {
  let monsterState = await getMonstersStateFromRedis(boardId, mapId);
  if (!monsterState.monsters?.length) {
    return await populateMonsters();
  }

  return monsterState
}
