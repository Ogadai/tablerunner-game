import { getPlayerReadyState, setPlayerReady } from './playerReadyState';
import { getReadyStateFromRedis, lockReadyStateInRedis, setReadyStateInRedis, publishReadyStateUpdated } from './redis-access';
import { checkAllPlayersReady } from '../runner/game-runner';
import type { PlayerReadyState } from './types';

jest.mock('./redis-access', () => ({ getReadyStateFromRedis: jest.fn(), lockReadyStateInRedis: jest.fn(), setReadyStateInRedis: jest.fn(), publishReadyStateUpdated: jest.fn() }));
jest.mock('../runner/game-runner', () => ({ checkAllPlayersReady: jest.fn() }));
const release = jest.fn<Promise<void>, []>();
let state: PlayerReadyState;
beforeEach(() => {
  jest.resetAllMocks();
  state = { readyPlayerIds: ['hero', 'other', 'hero'], readyPlayerDirection: { hero: 'n', other: 's' } };
  jest.mocked(getReadyStateFromRedis).mockResolvedValue(state);
  jest.mocked(lockReadyStateInRedis).mockResolvedValue(release);
  release.mockResolvedValue();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

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
  }, { notify: false });
  expect(events).toEqual(['save', 'release', 'turn']);
  expect(checkAllPlayersReady).toHaveBeenCalledWith('board', 'map');
  expect(jest.mocked(publishReadyStateUpdated).mock.invocationCallOrder[0]).toBeLessThan(release.mock.invocationCallOrder[0]);
  expect(publishReadyStateUpdated).toHaveBeenCalledWith('board', 'map', {
    readyPlayerIds: ['other', 'hero'], readyPlayerDirection: { hero: 'e', other: 's' },
  });
  expect(release).toHaveBeenCalledTimes(1);
  expect(state.readyPlayerIds).toEqual(['hero', 'other', 'hero']);
  expect(state.readyPlayerDirection!.hero).toBe('n');
});

it('clears readiness and direction without starting a turn', async () => {
  await expect(setPlayerReady('board', 'map', 'hero', false)).resolves.toEqual({ success: true });
  expect(setReadyStateInRedis).toHaveBeenCalledWith('board', 'map', { readyPlayerIds: ['other'], readyPlayerDirection: { other: 's' } }, { notify: false });
  expect(checkAllPlayersReady).not.toHaveBeenCalled();
  expect(release).toHaveBeenCalledTimes(1);
});

it('supports a new ready state without directions', async () => {
  jest.mocked(getReadyStateFromRedis).mockResolvedValue({ readyPlayerIds: [] });
  await setPlayerReady('board', 'map', 'hero', true);
  expect(setReadyStateInRedis).toHaveBeenCalledWith('board', 'map', { readyPlayerIds: ['hero'], readyPlayerDirection: {} }, { notify: false });
});

it('preserves a selected direction when ready is resubmitted without one', async () => {
  await setPlayerReady('board', 'map', 'hero', true);
  expect(setReadyStateInRedis).toHaveBeenCalledWith('board', 'map', {
    readyPlayerIds: ['other', 'hero'], readyPlayerDirection: { hero: 'n', other: 's' },
  }, { notify: false });
});

it('serializes readiness snapshots until delivery settles before checking for a turn', async () => {
  let finishDelivery!: () => void;
  const delivery = new Promise<void>(resolve => { finishDelivery = resolve; });
  let startedDelivery!: () => void;
  const publishing = new Promise<void>(resolve => { startedDelivery = resolve; });
  jest.mocked(publishReadyStateUpdated).mockImplementation(async () => {
    startedDelivery();
    await delivery;
  });
  const result = setPlayerReady('board', 'map', 'hero', true);

  await publishing;
  expect(setReadyStateInRedis).toHaveBeenCalledTimes(1);
  expect(release).not.toHaveBeenCalled();
  expect(checkAllPlayersReady).not.toHaveBeenCalled();
  finishDelivery();
  await expect(result).resolves.toEqual({ success: true });
  expect(release).toHaveBeenCalledTimes(1);
  expect(checkAllPlayersReady).toHaveBeenCalledTimes(1);
});

it.each([true, false])('does not fail a saved readiness update when publication fails (ready=%s)', async ready => {
  jest.mocked(publishReadyStateUpdated).mockRejectedValue(new Error('publish failed'));
  await expect(setPlayerReady('board', 'map', 'hero', ready)).resolves.toEqual({ success: true });
  expect(checkAllPlayersReady).toHaveBeenCalledTimes(ready ? 1 : 0);
  expect(release).toHaveBeenCalledTimes(1);
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
