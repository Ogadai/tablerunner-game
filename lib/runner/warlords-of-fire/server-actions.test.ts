/** @jest-environment node */
import { warlordAllocateCoins, warlordEditParty } from './server-actions';
import { getGameStateFromRedis, getLocationsStateFromRedis, getPlayerInventoryFromRedis, lockGameStateInRedis, lockLocationsStateInRedis, setGameStateInRedis, setLocationsStateInRedis, setPlayerInventoryInRedis, publishGameStateUpdated } from '@/lib/store/redis-access';
import { createGame, createLocations } from '@/lib/store/test-support/fixtures';
import { createMonster } from '../test-support/fixtures';
import { PlayerInventoryState } from '@/lib/store/types';
import { DEFAULT_TEAM_STATE, getState, saveState } from './territory-state';

jest.mock('@/lib/store/redis-access', () => ({
  getGameStateFromRedis: jest.fn(), getLocationsStateFromRedis: jest.fn(),
  lockGameStateInRedis: jest.fn(), lockLocationsStateInRedis: jest.fn(),
  setLocationsStateInRedis: jest.fn(), publishGameStateUpdated: jest.fn(),
  getPlayerInventoryFromRedis: jest.fn(), setPlayerInventoryInRedis: jest.fn(), setGameStateInRedis: jest.fn(),
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

function setupCoins() {
  const { game, player } = setup();
  game.gameId = 'warlordsfire';
  player.coins = 100;
  saveState(game, { teams: { [player.team!]: { ...DEFAULT_TEAM_STATE, coins: 50 } } });
  let inventory: PlayerInventoryState = { equipment: null, equipped: { weapon: 'pending-sword' } };
  jest.mocked(getPlayerInventoryFromRedis).mockImplementation(async () => inventory);
  jest.mocked(setPlayerInventoryInRedis).mockImplementation(async (_board, _map, _player, next) => { inventory = next; });
  return { game, player, getInventory: () => inventory };
}

it('reserves deposits and withdrawals in inventory and preserves purchases between allocations', async () => {
  const { game, player, getInventory } = setupCoins();
  expect(await warlordAllocateCoins('board', 'map', player.id, 100)).toMatchObject({
    success: true, data: { coins: 50, teamCoinTransfer: 50, equipped: { weapon: 'pending-sword' } },
  });
  getInventory().coins! -= 40; // A purchase spends only the pending personal balance.
  expect(await warlordAllocateCoins('board', 'map', player.id, 60)).toMatchObject({
    success: true, data: { coins: 50, teamCoinTransfer: 10 },
  });
  expect(await warlordAllocateCoins('board', 'map', player.id, 0)).toMatchObject({
    success: true, data: { coins: 110, teamCoinTransfer: -50 },
  });
  expect(player.coins).toBe(100);
  expect(getState(game).teams[player.team!].coins).toBe(50);
  expect(setGameStateInRedis).not.toHaveBeenCalled();
  expect(publishGameStateUpdated).not.toHaveBeenCalled();
  expect(releaseGame).toHaveBeenCalledTimes(3);
});

it.each([-1, 1.5, NaN, Infinity, 151])('rejects an invalid team allocation (%s)', async coins => {
  const { player } = setupCoins();
  expect(await warlordAllocateCoins('board', 'map', player.id, coins)).toMatchObject({ success: false });
  expect(setPlayerInventoryInRedis).not.toHaveBeenCalled();
  expect(releaseGame).toHaveBeenCalledTimes(1);
});

it.each(['other game', 'missing player', 'dead player', 'missing team'])('rejects unavailable allocation (%s)', async reason => {
  const { game, player } = setupCoins();
  if (reason === 'other game') game.gameId = 'test-game';
  if (reason === 'missing player') game.players = [];
  if (reason === 'dead player') player.health = 0;
  if (reason === 'missing team') saveState(game, { teams: {} });
  expect(await warlordAllocateCoins('board', 'map', player.id, 50)).toMatchObject({ success: false });
  expect(setPlayerInventoryInRedis).not.toHaveBeenCalled();
  expect(releaseGame).toHaveBeenCalledTimes(1);
});

it('releases the game lock if saving an allocation fails', async () => {
  const { player } = setupCoins();
  jest.mocked(setPlayerInventoryInRedis).mockRejectedValue(new Error('Save failed'));
  expect(await warlordAllocateCoins('board', 'map', player.id, 100)).toEqual({ success: false, error: 'Save failed' });
  expect(releaseGame).toHaveBeenCalledTimes(1);
});
