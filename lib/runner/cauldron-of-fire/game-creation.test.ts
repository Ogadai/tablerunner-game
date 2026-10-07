import { createStarterPlayer } from './game-creation';
import { allItems } from '../../games/items';
import { characters } from '../../games/characters';

it('creates a player with the Cauldron of Fire starting properties', () => {
  expect(createStarterPlayer(characters.mage, [])).toEqual({
    location: 10, level: 1, availableStats: 5, coins: 20, team: 'good',
    equipment: [allItems.resurrectionStore],
  });
});

it('keeps starting properties independent between players', () => {
  const first = createStarterPlayer(characters.mage, []);
  first.coins = 0;
  first.location = 23;
  first.equipment.pop();

  const second = createStarterPlayer(characters.mage, []);
  expect(second).not.toBe(first);
  expect(second).toMatchObject({ coins: 20, location: 10 });
  expect(second.equipment).not.toBe(first.equipment);
  expect(second.equipment).toEqual([allItems.resurrectionStore]);
});
