import {
  GameState,
  PlayerActionMove,
  PlayerActionType,
  PlayerReadyState,
  PlayerState,
  AllMonsterState,
  PlayerMessagesState,
  PlayerActionAttack,
  MonsterState,
} from "../store/types";
import {
  getActionsStateFromRedis,
  getGameStateFromRedis,
  setActionsStateInRedis,
  setGameStateInRedis,
  setReadyStateInRedis,
  getMonstersStateFromRedis,
  setMonstersStateInRedis,
  setPlayerMessagesInRedis,
} from '../store/redis-access';
import { games } from "../games/games";
import { BaseStats, OPPOSITE_DIRECTION } from '@/lib/games/types';
import { monsters } from "../games/monsters";

interface BaseParams {
  boardId: string;
  mapId: string;
  gameState: GameState;
  messages: Record<string, PlayerMessagesState>;
}

export async function checkAllPlayersReady(boardId: string, mapId: string, readyState: PlayerReadyState): Promise<void> {
  const gameState = await getGameStateFromRedis(boardId, mapId);

  if (gameState.players.every(player =>
    readyState.readyPlayerIds.includes(player.id)
  )) {
    await processGameTurn({ boardId, mapId, gameState, messages: {} });
  }
}

export async function processGameTurn(params: BaseParams): Promise<void> {
  // Run the game turn
  const newGameState = await runGameTurn(params);

  // Update game state
  await setGameStateInRedis(params.boardId, params.mapId, newGameState);

  // Reset ready state
  await setReadyStateInRedis(params.boardId, params.mapId, {
    readyPlayerIds: []
  });

  // Set messages
  for(const player of newGameState.players) {
    await setPlayerMessagesInRedis(params.boardId, params.mapId, player.id, params.messages[player.id]);
  }
}

async function runGameTurn(params: BaseParams): Promise<GameState> {
  const newGameState: GameState = {
    ...params.gameState,
    players: params.gameState.players.map(p => ({...p}))
  };

  const monsterState = await getMonsterState(params);

  for(const player of newGameState.players) {
    params.messages[player.id] = { messages: []};

    const actionState = await getActionsStateFromRedis(params.boardId, params.mapId, player.id);
    const monstersAtLocation = monsterState.monsters.filter(m => m.location === player.location.id);

    // Apply the actions
    for(const action of actionState.actions) {
      switch(action.type) {
        case PlayerActionType.Move:
          if (monstersAtLocation.length === 0 || (action as PlayerActionMove).direction === player.retreatDirection) {
            actionMove(params, player, action as PlayerActionMove);
          }
          break;
        case PlayerActionType.Attack:
          actionAttack(params, player, action as PlayerActionAttack, monsterState);
          break;
      }
    }
  }

  for(const player of newGameState.players) {
    setActionsStateInRedis(params.boardId, params.mapId, player.id, {
      actions: []
    });
  }

  setMonstersStateInRedis(params.boardId, params.mapId, monsterState);

  return newGameState;
}

async function getMonsterState(params: BaseParams): Promise<AllMonsterState> {
  let monsterState = await getMonstersStateFromRedis(params.boardId, params.mapId);
  if (!monsterState.monsters?.length) {
    return await populateMonsters(params);
  }

  return monsterState
}

async function populateMonsters(params: BaseParams): Promise<AllMonsterState> {
  const monsterState = {
    monsters: [
      { id: 'rat.1', type: 'rat', location: 50, health: 5 },
      { id: 'rat.2', type: 'rat', location: 50, health: 3 },
      { id: 'rat.3', type: 'rat', location: 32, health: 5 },
      { id: 'spider.1', type: 'spider', location: 51, health: 2 },
      { id: 'spider.2', type: 'spider', location: 51, health: 5 },
      { id: 'spider.3', type: 'spider', location: 52, health: 4 },
      { id: 'spider.4', type: 'spider', location: 52, health: 5 }
    ]
  };

  return monsterState;
}

function actionMove(params: BaseParams, player: PlayerState, action: PlayerActionMove): void {
  const gameDef = games.find(g => g.id === params.gameState.gameId)!;

  const currentLocation = gameDef.locations.find(l => l.id === player.location.id)!;
  const locationMove = currentLocation.move.find(m => m.direction === action.direction);

  if (locationMove) {
    const newLocation = gameDef.locations.find(l => l.id === locationMove.id)!;

    player.location = newLocation;
    player.retreatDirection = OPPOSITE_DIRECTION[action.direction];
    params.gameState.visited = [
      ...params.gameState.visited.filter(v => v !== locationMove.id),
      locationMove.id
    ]
  }
}

function actionAttack(params: BaseParams, player: PlayerState, action: PlayerActionAttack, monstersState: AllMonsterState): void {
  const monster = monstersState.monsters.find(m => m.id === action.target);

  if (monster) {
    const monsterDef = monsters[monster.type];
    const damage = processAttackForDamage(player.baseStats!, monsterDef.baseStats);

    if (damage > 0) {
      monster.health -= damage;
      if (monster.health <= 0) {
        monstersState.monsters = monstersState.monsters.filter(m => m.id !== action.target);
      }

      params.messages[player.id].messages.push({
        text: `**You** hit **${monster.type}** for ${damage} damage${monster.health <= 0 ? ' and **defeated** it!' : ''}`
      });
    } else {
      params.messages[player.id].messages.push({
        text: `**You** missed **${monster.type}**`
      });
    }
  }
}

function processAttackForDamage(attackerStats: BaseStats, defenderStats: BaseStats): number {
  const attackScore = Math.random() * attackerStats.attack;
  const defenseScore = Math.random() * defenderStats.defence;

  if (attackScore >= defenseScore) {
    return Math.ceil(Math.random() * attackerStats.damage);
  }

  return 0;
}