import { getPlayerAddStatsState, setPlayerAddStatsState } from './playerStatsState';
import { getPlayerStatsFromRedis, setPlayerStatsInRedis } from './redis-access';
import { createPlayer } from './test-support/fixtures';

jest.mock('./redis-access', () => ({ getPlayerStatsFromRedis: jest.fn(), setPlayerStatsInRedis: jest.fn() }));
beforeEach(() => jest.resetAllMocks());

it.each([null, createPlayer().characterStats])('reads and saves pending stat changes, including clearing them', async characterStats => {
  const state = { characterStats };
  jest.mocked(getPlayerStatsFromRedis).mockResolvedValue(state);
  await expect(getPlayerAddStatsState('board', 'map', 'hero')).resolves.toEqual({ success: true, data: state });
  expect(getPlayerStatsFromRedis).toHaveBeenCalledWith('board', 'map', 'hero');
  await expect(setPlayerAddStatsState('board', 'map', 'hero', state)).resolves.toEqual({ success: true });
  expect(setPlayerStatsInRedis).toHaveBeenCalledWith('board', 'map', 'hero', state);
});

it('reports read and write errors', async () => {
  jest.mocked(getPlayerStatsFromRedis).mockRejectedValue(new Error('Read failed'));
  jest.mocked(setPlayerStatsInRedis).mockRejectedValue(new Error('Write failed'));
  await expect(getPlayerAddStatsState('board', 'map', 'hero')).resolves.toEqual({ success: false, error: 'Read failed' });
  await expect(setPlayerAddStatsState('board', 'map', 'hero', { characterStats: null })).resolves.toEqual({ success: false, error: 'Write failed' });
});
