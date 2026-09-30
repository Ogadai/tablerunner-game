/** @jest-environment node */
import { populateMonsters } from './populate-monsters';
import { gameRunners } from './games';
import { createGame, createMonster } from './test-support/fixtures';

jest.mock('./games', () => ({ gameRunners: { cauldronfire: { getMonsters: jest.fn() } } }));

const { getMonsters } = gameRunners.cauldronfire;

it.each([undefined, 4])('passes the player count to map population (%s)', async count => {
  const game = createGame({ gameId: 'cauldronfire' });
  const monsters = [createMonster()];
  jest.mocked(getMonsters).mockResolvedValue(monsters);
  expect(await populateMonsters(game, count)).toBe(monsters);
  expect(getMonsters).toHaveBeenCalledWith(game, count ?? 1);
});
