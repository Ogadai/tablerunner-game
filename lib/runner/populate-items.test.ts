/** @jest-environment node */
import { populateItemsForMap } from './populate-items';
import { createGame } from './test-support/fixtures';

jest.mock('../store/redis-access', () => ({}));
jest.mock('../games/games', () => ({ games: [{ map: 'test-map', itemLocations: [
  { locations: [1, 2], itemIds: ['healingPotion', 'manaPotion'] },
  { locations: [3], itemIds: ['healingPotion'] },
] }] }));
afterEach(() => jest.restoreAllMocks());

it('selects from configured locations and items and assigns unique IDs', async () => {
  jest.spyOn(Math, 'random').mockReturnValue(0.99);
  const game = createGame();
  expect(await populateItemsForMap(game, 'test-map')).toEqual([
    { id: 'i-1', type: 'manaPotion', location: 2 }, { id: 'i-2', type: 'healingPotion', location: 3 },
  ]);
  expect(game.counters.itemId).toBe(2);
});

it('returns no items for unknown maps without allocating IDs', async () => {
  const game = createGame();
  expect(await populateItemsForMap(game, 'missing')).toEqual([]);
  expect(game.counters.itemId).toBe(0);
});
