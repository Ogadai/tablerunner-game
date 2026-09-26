/** @jest-environment node */
import { populateMonsters } from './populate-monsters';
import { getMonsters } from '../games/maps/cauldron-of-fire';
import { createGame, createMonster } from './test-support/fixtures';

jest.mock('../games/maps/cauldron-of-fire/index', () => ({ getMonsters: jest.fn() }));

it.each([undefined, 4])('passes the player count to map population (%s)', async count => {
  const game = createGame({ gameId: 'cauldronfire' });
  const monsters = [createMonster()];
  jest.mocked(getMonsters).mockResolvedValue(monsters);
  expect(await populateMonsters(game, count)).toBe(monsters);
  expect(getMonsters).toHaveBeenCalledWith(game, count ?? 1);
});
