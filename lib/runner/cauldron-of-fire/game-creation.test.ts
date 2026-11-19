import { createStarterPlayer } from './game-creation';
import { allItems } from '../../games/items';
import { characters } from '../../games/characters';
import { getItemDefsCoinValue } from '../mid-game-join';
import { createGame, createPlayer } from '../test-support/fixtures';

it('creates a player with the Cauldron of Fire starting properties', () => {
  expect(createStarterPlayer()).toEqual({
    location: 10, level: 1, availableStats: 5, coins: 20, team: 'good',
    equipment: [allItems.resurrectionStore],
  });
});

it('uses default starting properties on turn 0 even when other players exist', () => {
  const game = createGame({
    gameId: 'cauldronfire',
    turn: 0,
    players: [createPlayer({ id: 'barbarian', level: 1, points: 0, coins: 20 })],
  });

  expect(createStarterPlayer(characters.mage, game)).toEqual({
    location: 10, level: 1, availableStats: 5, coins: 20, team: 'good',
    equipment: [allItems.resurrectionStore],
  });
});

it('catches up a player joining mid-game and subtracts their starter inventory value', () => {
  const game = createGame({
    gameId: 'cauldronfire',
    turn: 10,
    players: [
      createPlayer({
        id: 'barbarian',
        level: 4,
        points: 250,
        coins: 150,
        equipment: [
          { id: 'i-1', type: 'swordLegendary' },    // 60
          { id: 'i-2', type: 'resurrectionStore' }, // 300 -> total 510
        ],
      }),
      createPlayer({
        id: 'ranger',
        level: 3,
        points: 130,
        coins: 125,
        equipment: [
          { id: 'i-3', type: 'swordSteel' },        // 25
          { id: 'i-4', type: 'resurrectionStore' }, // 300 -> total 450
        ],
      }),
    ],
  });

  // Average total value = (510 + 450) / 2 = 480
  const starterInventoryValue = getItemDefsCoinValue([
    ...characters.mage.equipment,
    allItems.resurrectionStore,
  ]);

  expect(createStarterPlayer(characters.mage, game)).toEqual({
    location: 10,
    level: 3,
    points: 130,
    availableStats: 9, // 5 + (3 - 1) * 2
    coins: 480 - starterInventoryValue,
    team: 'good',
    equipment: [allItems.resurrectionStore],
  });
});

it('keeps starting properties independent between players', () => {
  const first = createStarterPlayer();
  first.coins = 0;
  first.location = 23;
  first.equipment.pop();

  const second = createStarterPlayer();
  expect(second).not.toBe(first);
  expect(second).toMatchObject({ coins: 20, location: 10 });
  expect(second.equipment).not.toBe(first.equipment);
  expect(second.equipment).toEqual([allItems.resurrectionStore]);
});
