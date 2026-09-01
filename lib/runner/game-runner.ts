import {
  GameState,
  PlayerActionMove,
  PlayerActionType,
  PlayerReadyState,
  PlayerState,
  MonsterState,
  AllMonsterState,
} from "../store/types";
import {
  getActionsStateFromRedis,
  getGameStateFromRedis,
  setActionsStateInRedis,
  setGameStateInRedis,
  setReadyStateInRedis,
  getMonstersStateFromRedis,
  setMonstersStateInRedis,
} from '../store/redis-access';
import { games } from "../games/games";
import { monsters } from "../games/monsters";

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

  const monsterState = await getMonsterState(boardId, mapId, newGameState);

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

  setMonstersStateInRedis(boardId, mapId, monsterState);

  return newGameState;
}

async function getMonsterState(boardId: string, mapId: string, gameState: GameState): Promise<AllMonsterState> {
  let monsterState = await getMonstersStateFromRedis(boardId, mapId);
  if (!monsterState.monsters?.length) {
    return await populateMonsters(boardId, mapId, gameState);
  }

  return monsterState
}

async function populateMonsters(boardId: string, mapId: string, gameState: GameState): Promise<AllMonsterState> {
  const monsterState = {
    monsters: [
      { key: 'rat.1', id: 'rat', location: 50, health: 5 },
      { key: 'rat.2', id: 'rat', location: 50, health: 3 },
      { key: 'rat.3', id: 'rat', location: 32, health: 5 },
      { key: 'spider.1', id: 'spider', location: 51, health: 2 },
      { key: 'spider.2', id: 'spider', location: 51, health: 5 },
      { key: 'spider.3', id: 'spider', location: 52, health: 4 },
      { key: 'spider.4', id: 'spider', location: 52, health: 5 }
    ]
  };

  return monsterState;
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