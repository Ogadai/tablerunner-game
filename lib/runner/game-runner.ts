import { GameState, PlayerActionMove, PlayerActionType, PlayerReadyState, PlayerState } from "../store/types";
import { getActionsStateFromRedis, getGameStateFromRedis, setActionsStateInRedis, setGameStateInRedis, setReadyStateInRedis } from '../store/redis-access';
import { games } from "../games/games";

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
    ...gameState,
    players: gameState.players.map(p => ({...p}))
  };

  for(const player of newGameState.players) {
    const actionState = await getActionsStateFromRedis(boardId, mapId, player.id);

    // Apply the actions
    for(const action of actionState.actions) {
      switch(action.type) {
        case PlayerActionType.Move:
          actionMove(boardId, mapId, player, newGameState, action as PlayerActionMove);
          break;
      }
    }
  }

  for(const player of newGameState.players) {
    setActionsStateInRedis(boardId, mapId, player.id, {
      actions: []
    });
  } 

  return newGameState;
}

function actionMove(boardId: string, mapId: string, player: PlayerState, gameState: GameState, action: PlayerActionMove): void {
  const gameDef = games.find(g => g.id === gameState.gameId)!;

  const currentLocation = gameDef.locations.find(l => l.id === player.location.id)!;
  const locationMove = currentLocation.move.find(m => m.direction === action.direction);

  if (locationMove) {
    const newLocation = gameDef.locations.find(l => l.id === locationMove.id)!;

    player.location = newLocation;
    gameState.visited = [
      ...gameState.visited.filter(v => v !== locationMove.id),
      locationMove.id
    ]
  }
}