import { createStarterPlayer } from './game-creation';
import { allItems } from '../../games/items';
import { characters } from '../../games/characters';
import { getItemDefsCoinValue } from '../mid-game-join';
import { createGame, createPlayer } from '../test-support/fixtures';

it('creates a player with the Race of Fire starting properties', () => {
  expect(createStarterPlayer()).toEqual({
    location: 10, level: 1, availableStats: 12, coins: 200, team: 'good',
    equipment: [],
  });
});

it('uses default starting properties on turn 0 even when other players exist', () => {
  const game = createGame({
    gameId: 'racefire',
    turn: 0,
    players: [createPlayer({ id: 'barbarian', level: 1, points: 0, coins: 200 })],
  });

  expect(createStarterPlayer(characters.mage, game)).toEqual({
    location: 10, level: 1, availableStats: 12, coins: 200, team: 'good',
    equipment: [],
  });
});

it('catches up a player joining mid-game and subtracts their starter inventory value', () => {
  const game = createGame({
    gameId: 'racefire',
    turn: 7,
    players: [
      createPlayer({
        id: 'barbarian',
        level: 3,
        points: 140,
        coins: 120,
        equipment: [{ id: 'i-1', type: 'swordArcane' }], // 180 -> total 300
      }),
      createPlayer({
        id: 'witch',
        level: 2,
        points: 45,
        coins: 100,
        equipment: [{ id: 'i-2', type: 'swordLegendary' }], // 60 -> total 160
      }),
    ],
  });

  // Average total value = (300 + 160) / 2 = 230
  const starterInventoryValue = getItemDefsCoinValue(characters.mage.equipment);

  expect(createStarterPlayer(characters.mage, game)).toEqual({
    location: 10,
    level: 2,
    points: 45,
    availableStats: 14, // 12 + (2 - 1) * 2
    coins: 230 - starterInventoryValue,
    team: 'good',
    equipment: [],
  });
});

it('keeps starting properties independent between players', () => {
  const first = createStarterPlayer();
  first.coins = 0;
  first.location = 23;
  first.equipment.push(allItems.resurrectionStore);

  const second = createStarterPlayer();
  expect(second).not.toBe(first);
  expect(second).toMatchObject({ coins: 200, location: 10 });
  expect(second.equipment).not.toBe(first.equipment);
  expect(second.equipment).toEqual([]);
});
