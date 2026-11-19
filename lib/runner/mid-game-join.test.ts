import { allItems } from '../games/items';
import { STATS_PER_LEVEL } from './level-up';
import { calculateMidGameJoinCatchUp, getPlayerTotalCoinValue } from './mid-game-join';
import { createGame, createPlayer } from './test-support/fixtures';

describe('getPlayerTotalCoinValue', () => {
  it('sums player coins and the coin value of all carried items', () => {
    const player = createPlayer({
      coins: 45,
      equipment: [
        { id: 'i-1', type: 'swordSteel' },     // value 25
        { id: 'i-2', type: 'swordLegendary' }, // value 60
        { id: 'i-3', type: 'fireCrystalShard' }, // no value
        { id: 'i-4', type: 'unknownItem' },      // unknown
      ],
    });

    const expected = 45 + (allItems.swordSteel.value ?? 0) + (allItems.swordLegendary.value ?? 0);
    expect(getPlayerTotalCoinValue(player)).toBe(expected);
  });
});

describe('calculateMidGameJoinCatchUp', () => {
  it('returns null before the game starts or when there are no existing players', () => {
    expect(calculateMidGameJoinCatchUp(undefined, 5)).toBeNull();
    expect(calculateMidGameJoinCatchUp(createGame({ turn: 0 }), 5)).toBeNull();
    expect(calculateMidGameJoinCatchUp(createGame({ turn: 5, players: [] }), 5)).toBeNull();
  });

  it('uses the lowest player level and points and calculates available stats', () => {
    const game = createGame({
      turn: 8,
      players: [
        createPlayer({ id: 'p1', level: 4, points: 260, coins: 100, equipment: [] }),
        createPlayer({ id: 'p2', level: 2, points: 65, coins: 50, equipment: [] }),
        createPlayer({ id: 'p3', level: 3, points: 140, coins: 80, equipment: [] }),
      ],
    });

    expect(calculateMidGameJoinCatchUp(game, 5)).toEqual({
      level: 2,
      points: 65,
      availableStats: 5 + STATS_PER_LEVEL,
      coins: Math.round((100 + 50 + 80) / 3),
    });
  });

  it('breaks ties on equal level using the lowest points', () => {
    const game = createGame({
      turn: 6,
      players: [
        createPlayer({ id: 'p1', level: 3, points: 180, coins: 40, equipment: [] }),
        createPlayer({ id: 'p2', level: 3, points: 115, coins: 60, equipment: [] }),
      ],
    });

    expect(calculateMidGameJoinCatchUp(game, 12)).toEqual({
      level: 3,
      points: 115,
      availableStats: 12 + 2 * STATS_PER_LEVEL,
      coins: 50,
    });
  });

  it('averages total coin value including equipped and unequipped items', () => {
    const game = createGame({
      turn: 4,
      players: [
        createPlayer({
          id: 'p1',
          level: 1,
          points: 15,
          coins: 30,
          equipment: [
            { id: 'i-1', type: 'swordSteel' },     // 25
            { id: 'i-2', type: 'swordRusty' },     // 10
          ],
        }),
        createPlayer({
          id: 'p2',
          level: 2,
          points: 40,
          coins: 10,
          equipment: [
            { id: 'i-3', type: 'swordLegendary' }, // 60
            { id: 'i-4', type: 'questSunMedallion' }, // 0
          ],
        }),
      ],
    });

    // p1: 30 + 25 + 10 = 65; p2: 10 + 60 = 70; avg = 67.5 -> 68
    expect(calculateMidGameJoinCatchUp(game, 5)).toEqual({
      level: 1,
      points: 15,
      availableStats: 5,
      coins: 68,
    });
  });
});
