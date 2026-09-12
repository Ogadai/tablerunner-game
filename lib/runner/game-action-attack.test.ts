import { genericAttackMonster } from './game-action-attack';
import { BaseParams } from './base-params';
import { MonsterState, PlayerState } from '../store/types';

jest.mock('./apply-inventory', () => ({
  createItemForInventory: jest.fn(() => ({ id: 'item' })),
}));

function createPlayer(id: string, health = 10): PlayerState {
  return {
    id,
    name: id,
    location: { id: 1, description: '', move: [] },
    rgbColour: '#fff',
    characterStats: { strength: 1, skill: 1, reactions: 1, resiliance: 1, intelligence: 1 },
    health,
    magic: 0,
    level: 1,
    points: 0,
    availableStats: 0,
    equipment: [],
    equipped: {},
    spells: [],
    coins: 0,
  };
}

function createMonster(id: string, type: string, health = 1): MonsterState {
  return { id, type, location: 1, health };
}

function createParams(monsters: MonsterState[], players: PlayerState[]): BaseParams {
  return {
    boardId: 'board',
    mapId: 'map',
    gameState: {
      gameId: 'game',
      name: 'game',
      characters: [],
      players,
      visited: [],
      stores: [],
      portals: [],
      leds: [],
      counters: { monsterId: 0, itemId: 0 },
    },
    messages: { p1: { messages: [] }, p2: { messages: [] } },
    monsters,
    items: [],
    coins: [],
    blockedMoves: [],
  };
}

describe('genericAttackMonster coin drops', () => {
  it('accumulates coins until the last monster dies, then distributes them', () => {
    const firstMonster = createMonster('m1', 'rat');
    const lastMonster = createMonster('m2', 'spider');
    const firstPlayer = createPlayer('p1');
    const secondPlayer = createPlayer('p2');
    const params = createParams([firstMonster, lastMonster], [firstPlayer, secondPlayer]);
    const randomValues = [0.9, 0, 0.5, 0.9, 0.9, 0.9, 0, 0.5, 0.9, 0.9];
    jest.spyOn(Math, 'random').mockImplementation(() => randomValues.shift() ?? 0);

    genericAttackMonster(params, firstPlayer, { attack: 10, damage: 1 }, firstMonster);

    expect(params.coins).toHaveLength(1);
    expect(params.coins[0]).toEqual({ location: 1, coins: 2 });
    expect(firstPlayer.coins).toBe(0);
    expect(secondPlayer.coins).toBe(0);

    genericAttackMonster(params, firstPlayer, { attack: 10, damage: 1 }, lastMonster);

    expect(params.coins).toEqual([]);
    expect(firstPlayer.coins).toBe(3);
    expect(secondPlayer.coins).toBe(2);
  });
});