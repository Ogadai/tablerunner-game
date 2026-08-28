import { GameState, PlayerReadyState } from "../store/types";
import { getGameStateFromRedis, setGameStateInRedis, setReadyStateInRedis } from '../store/redis-access';

export async function checkAllPlayersReady(boardId: string, mapId: string, readyState: PlayerReadyState): Promise<void> {
  const gameState = await getGameStateFromRedis(boardId, mapId);

  if (gameState.players.every(player =>
    readyState.readyPlayerIds.includes(player.id)
  )) {
    await processGameTurn(boardId, mapId, gameState)
  }
}

export async function processGameTurn(boardId: string, mapId: string, gameState: GameState): Promise<void> {

  // Run the game turn
  const newGameState = await runGameTurn(boardId, mapId, gameState);

  // Update game state
  await setGameStateInRedis(boardId, mapId, newGameState);

  // Reset ready state
  await setReadyStateInRedis(boardId, mapId, {
    readyPlayerIds: []
  });
}

async function runGameTurn(boardId: string, mapId: string, gameState: GameState): Promise<GameState> {
  const newGameState: GameState = {
    ...gameState
  };

  return newGameState;
}