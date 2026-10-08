/** @jest-environment node */
import { warlordEditParty } from './server-actions';
import { getGameStateFromRedis, getLocationsStateFromRedis, lockGameStateInRedis, lockLocationsStateInRedis, setLocationsStateInRedis, publishGameStateUpdated } from '@/lib/store/redis-access';
import { createGame, createLocations } from '@/lib/store/test-support/fixtures';
import { createMonster } from '../test-support/fixtures';

jest.mock('@/lib/store/redis-access', () => ({
  getGameStateFromRedis: jest.fn(), getLocationsStateFromRedis: jest.fn(),
  lockGameStateInRedis: jest.fn(), lockLocationsStateInRedis: jest.fn(),
  setLocationsStateInRedis: jest.fn(), publishGameStateUpdated: jest.fn(),
}));

const releaseGame = jest.fn();
const releaseLocations = jest.fn();

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(lockGameStateInRedis).mockResolvedValue(releaseGame);
  jest.mocked(lockLocationsStateInRedis).mockResolvedValue(releaseLocations);
});

function setup() {
  const game = createGame();
  const player = game.players[0];
  const monster = createMonster({ team: player.team, masterId: player.id });
  const locations = createLocations({ monsters: [monster] });
  jest.mocked(getGameStateFromRedis).mockResolvedValue(game);
  jest.mocked(getLocationsStateFromRedis).mockResolvedValue(locations);
  return { game, player, monster, locations };
}

it.each([true, false])('saves party membership without broadcasting a game update (inParty: %s)', async inParty => {
  const { player, monster, locations } = setup();
  if (inParty) delete monster.masterId;

  expect(await warlordEditParty('board', 'map', player.id, monster.id, inParty)).toEqual({ success: true });

  if (inParty) expect(monster.masterId).toBe(player.id);
  else expect(monster).not.toHaveProperty('masterId');
  expect(setLocationsStateInRedis).toHaveBeenCalledWith('board', 'map', locations);
  expect(publishGameStateUpdated).not.toHaveBeenCalled();
  expect(releaseLocations).toHaveBeenCalledTimes(1);
  expect(releaseGame).toHaveBeenCalledTimes(1);
  expect(jest.mocked(lockGameStateInRedis).mock.invocationCallOrder[0])
    .toBeLessThan(jest.mocked(lockLocationsStateInRedis).mock.invocationCallOrder[0]);
});

it.each(['missing player', 'missing monster', 'other location', 'other team', 'no team', 'dead player', 'dead monster', 'other party'])(
  'rejects an unavailable party edit (%s)', async reason => {
    const { game, player, monster, locations } = setup();
    switch (reason) {
      case 'missing player': game.players = []; break;
      case 'missing monster': locations.monsters = []; break;
      case 'other location': monster.location++; break;
      case 'other team': monster.team = 'enemy'; break;
      case 'no team': player.team = monster.team = null; break;
      case 'dead player': player.health = 0; break;
      case 'dead monster': monster.health = 0; break;
      case 'other party': monster.masterId = 'other-player'; break;
    }

    const result = await warlordEditParty('board', 'map', player.id, monster.id, true);

    expect(result).toMatchObject({ success: false, error: expect.any(String) });
    expect(setLocationsStateInRedis).not.toHaveBeenCalled();
    expect(publishGameStateUpdated).not.toHaveBeenCalled();
    expect(releaseLocations).toHaveBeenCalledTimes(1);
    expect(releaseGame).toHaveBeenCalledTimes(1);
  },
);

it('releases both locks when saving the party fails', async () => {
  const { player, monster } = setup();
  jest.mocked(setLocationsStateInRedis).mockRejectedValue(new Error('Save failed'));
  expect(await warlordEditParty('board', 'map', player.id, monster.id, false))
    .toEqual({ success: false, error: 'Save failed' });
  expect(releaseLocations).toHaveBeenCalledTimes(1);
  expect(releaseGame).toHaveBeenCalledTimes(1);
});
