import { createStarterPlayer } from './game-creation';
import { allItems } from '../../games/items';
import { characters } from '../../games/characters';

it('creates a player with the Race of Fire starting properties', () => {
  expect(createStarterPlayer(characters.mage, [])).toEqual({
    location: 10, level: 1, availableStats: 12, coins: 200, team: 'good',
    equipment: [],
  });
});

it('keeps starting properties independent between players', () => {
  const first = createStarterPlayer(characters.mage, []);
  first.coins = 0;
  first.location = 23;
  first.equipment.push(allItems.resurrectionStore);

  const second = createStarterPlayer(characters.mage, []);
  expect(second).not.toBe(first);
  expect(second).toMatchObject({ coins: 200, location: 10 });
  expect(second.equipment).not.toBe(first.equipment);
  expect(second.equipment).toEqual([]);
});
