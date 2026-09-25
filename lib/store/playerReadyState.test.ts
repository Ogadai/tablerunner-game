import { getPlayerReadyState, setPlayerReady } from './playerReadyState';
import { getReadyStateFromRedis, lockReadyStateInRedis, setReadyStateInRedis } from './redis-access';
import { checkAllPlayersReady } from '../runner/game-runner';
import type { PlayerReadyState } from './types';

jest.mock('./redis-access', () => ({ getReadyStateFromRedis: jest.fn(), lockReadyStateInRedis: jest.fn(), setReadyStateInRedis: jest.fn() }));
jest.mock('../runner/game-runner', () => ({ checkAllPlayersReady: jest.fn() }));
const release = jest.fn<Promise<void>, []>();
let state: PlayerReadyState;
beforeEach(() => {
  jest.resetAllMocks();
  state = { readyPlayerIds: ['hero', 'other', 'hero'], readyPlayerDirection: { hero: 'n', other: 's' } };
  jest.mocked(getReadyStateFromRedis).mockResolvedValue(state);
  jest.mocked(lockReadyStateInRedis).mockResolvedValue(release);
  release.mockResolvedValue();
});

it('reads readiness and reports read failures', async () => {
  await expect(getPlayerReadyState('board', 'map')).resolves.toEqual({ success: true, data: state });
  expect(getReadyStateFromRedis).toHaveBeenCalledWith('board', 'map');
  jest.mocked(getReadyStateFromRedis).mockRejectedValue(new Error('Read failed'));
  await expect(getPlayerReadyState('board', 'map')).resolves.toEqual({ success: false, error: 'Read failed' });
});

it('deduplicates readiness, changes direction, and releases the lock before executing a turn', async () => {
  const events: string[] = [];
  jest.mocked(setReadyStateInRedis).mockImplementation(async () => { events.push('save'); });
  release.mockImplementation(async () => { events.push('release'); });
  jest.mocked(checkAllPlayersReady).mockImplementation(async () => { events.push('turn'); });
  await expect(setPlayerReady('board', 'map', 'hero', true, 'e')).resolves.toEqual({ success: true });
  expect(setReadyStateInRedis).toHaveBeenCalledWith('board', 'map', {
    readyPlayerIds: ['other', 'hero'], readyPlayerDirection: { hero: 'e', other: 's' },
  });
  expect(events).toEqual(['save', 'release', 'turn']);
  expect(checkAllPlayersReady).toHaveBeenCalledWith('board', 'map');
  expect(release).toHaveBeenCalledTimes(1);
  expect(state.readyPlayerIds).toEqual(['hero', 'other', 'hero']);
  expect(state.readyPlayerDirection!.hero).toBe('n');
});

it('clears readiness and direction without starting a turn', async () => {
  await expect(setPlayerReady('board', 'map', 'hero', false)).resolves.toEqual({ success: true });
  expect(setReadyStateInRedis).toHaveBeenCalledWith('board', 'map', { readyPlayerIds: ['other'], readyPlayerDirection: { other: 's' } });
  expect(checkAllPlayersReady).not.toHaveBeenCalled();
  expect(release).toHaveBeenCalledTimes(1);
});

it('supports a new ready state without directions', async () => {
  jest.mocked(getReadyStateFromRedis).mockResolvedValue({ readyPlayerIds: [] });
  await setPlayerReady('board', 'map', 'hero', true);
  expect(setReadyStateInRedis).toHaveBeenCalledWith('board', 'map', { readyPlayerIds: ['hero'], readyPlayerDirection: {} });
});

it('preserves a selected direction when ready is resubmitted without one', async () => {
  await setPlayerReady('board', 'map', 'hero', true);
  expect(setReadyStateInRedis).toHaveBeenCalledWith('board', 'map', {
    readyPlayerIds: ['other', 'hero'], readyPlayerDirection: { hero: 'n', other: 's' },
  });
});

it.each([getReadyStateFromRedis, setReadyStateInRedis, checkAllPlayersReady])('releases acquired locks when an operation fails', async dependency => {
  jest.mocked(dependency).mockRejectedValue(new Error('Failed'));
  await expect(setPlayerReady('board', 'map', 'hero', true)).resolves.toEqual({ success: false, error: 'Failed' });
  expect(release).toHaveBeenCalledTimes(1);
  if (dependency !== checkAllPlayersReady) expect(checkAllPlayersReady).not.toHaveBeenCalled();
});

it('does no work if the readiness lock cannot be acquired', async () => {
  jest.mocked(lockReadyStateInRedis).mockRejectedValue(new Error('Locked'));
  await expect(setPlayerReady('board', 'map', 'hero', true)).resolves.toEqual({ success: false, error: 'Locked' });
  expect(getReadyStateFromRedis).not.toHaveBeenCalled();
  expect(release).not.toHaveBeenCalled();
});
