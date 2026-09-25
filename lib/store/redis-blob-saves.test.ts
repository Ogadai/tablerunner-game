/** @jest-environment node */
import { Redis } from '@upstash/redis';
import { getGameSnapshotFromRedis, restoreGameSnapshotInRedis } from './redis-blob-saves';
import { publishGameStateUpdated, publishReadyStateUpdated } from './redis-access';
import { createGame } from './test-support/fixtures';

jest.mock('@upstash/redis', () => ({ Redis: { fromEnv: jest.fn(() => ({ scan: jest.fn(), mget: jest.fn(), multi: jest.fn() })) } }));
jest.mock('./redis-access', () => ({
  getGameKey: (board: string, map: string) => `game:${board}:${map}`,
  getPlayersReadyKey: (board: string, map: string) => `playersReady:${board}:${map}`,
  publishGameStateUpdated: jest.fn(), publishReadyStateUpdated: jest.fn(),
}));
// Reuse the client created by the module, without opening a real connection.
const client = jest.mocked(Redis.fromEnv).mock.results[0].value as {
  scan: jest.Mock; mget: jest.Mock; multi: jest.Mock;
};
const transaction = { del: jest.fn(), set: jest.fn(), exec: jest.fn() };
beforeEach(() => {
  jest.clearAllMocks();
  client.scan.mockReset().mockResolvedValue(['0', []]);
  client.mget.mockReset();
  client.multi.mockReturnValue(transaction);
  transaction.exec.mockReset().mockResolvedValue([]);
});

it('scans all pages, deduplicates keys, includes orphan queues, and excludes locks and other games', async () => {
  const game = createGame();
  client.scan.mockResolvedValueOnce(['42', [
    'game:board:map', 'playerActions:board:map:removed', 'game:board:map-other',
    'gameStateLock:board:map', 'playerActions:board:map:', 'unknown:board:map',
  ]]).mockResolvedValueOnce(['0', ['playerActions:board:map:removed', 'store:board:map:1', 'playersReady:board:map:extra']]);
  client.mget.mockResolvedValue([game, { actions: [] }, null]);
  await expect(getGameSnapshotFromRedis('board', 'map')).resolves.toEqual({ gameState: game,
    redisState: { 'game:board:map': game, 'playerActions:board:map:removed': { actions: [] } } });
  expect(client.scan).toHaveBeenNthCalledWith(2, '42', { match: '*:board:map*', count: 100 });
  expect(client.mget).toHaveBeenCalledTimes(1);
  expect(client.mget).toHaveBeenCalledWith('game:board:map', 'playerActions:board:map:removed', 'store:board:map:1');
});

it('escapes Redis glob metacharacters in scope identifiers', async () => {
  client.mget.mockResolvedValue([createGame()]);
  await getGameSnapshotFromRedis('b*?[x]\\', 'map');
  expect(client.scan).toHaveBeenCalledWith('0', { match: '*:b\\*\\?\\[x\\]\\\\:map*', count: 100 });
});

it('rejects an absent game even if other state remains', async () => {
  client.mget.mockResolvedValue([null]);
  await expect(getGameSnapshotFromRedis('board', 'map')).rejects.toThrow('No game exists for this board and map');
});

it('replaces old state in one transaction and publishes only after it commits', async () => {
  const snapshot = { 'game:board:map': { ...createGame() }, 'playersReady:board:map': { readyPlayerIds: ['hero'], readyPlayerDirection: { hero: 'n' } } };
  client.scan.mockResolvedValue(['0', ['playerActions:board:map:stale']]);
  transaction.exec.mockImplementation(async () => {
    expect(publishGameStateUpdated).not.toHaveBeenCalled();
    expect(publishReadyStateUpdated).not.toHaveBeenCalled();
  });
  await restoreGameSnapshotInRedis('board', 'map', snapshot);
  expect(transaction.del).toHaveBeenCalledWith('game:board:map', 'playerActions:board:map:stale');
  expect(transaction.set.mock.calls).toEqual([
    ['game:board:map', snapshot['game:board:map'], { ex: 604800 }],
    ['playersReady:board:map', snapshot['playersReady:board:map'], { ex: 604800 }],
  ]);
  expect(transaction.exec).toHaveBeenCalledTimes(1);
  expect(publishGameStateUpdated).toHaveBeenCalledWith('board', 'map');
  expect(publishReadyStateUpdated).toHaveBeenCalledWith('board', 'map', snapshot['playersReady:board:map']);
});

it('publishes empty readiness when a save has no ready state', async () => {
  await restoreGameSnapshotInRedis('board', 'map', { 'game:board:map': { ...createGame() } });
  expect(publishReadyStateUpdated).toHaveBeenCalledWith('board', 'map', { readyPlayerIds: [] });
});

it.each(['game:other:map', 'game:board:map2', 'gameStateLock:board:map', 'playerActions:board:map:', 'unknown:board:map'])('rejects forbidden saved key %s before scanning or deleting', async key => {
  await expect(restoreGameSnapshotInRedis('board', 'map', { 'game:board:map': {}, [key]: {} })).rejects.toThrow('Saved game contains missing or invalid Redis keys');
  expect(client.scan).not.toHaveBeenCalled();
  expect(client.multi).not.toHaveBeenCalled();
});

it('requires an own game-state key', async () => {
  await expect(restoreGameSnapshotInRedis('board', 'map', {})).rejects.toThrow('Saved game contains missing or invalid Redis keys');
  expect(client.multi).not.toHaveBeenCalled();
});

it.each([{}, { readyPlayerIds: 'hero' }, { readyPlayerIds: [1] }])('rejects malformed ready state %j', async ready => {
  await expect(restoreGameSnapshotInRedis('board', 'map', { 'game:board:map': {}, 'playersReady:board:map': ready })).rejects.toThrow('Saved game contains invalid ready state');
  expect(client.multi).not.toHaveBeenCalled();
});

it('does not publish after a failed commit', async () => {
  transaction.exec.mockRejectedValue(new Error('Commit failed'));
  await expect(restoreGameSnapshotInRedis('board', 'map', { 'game:board:map': {} })).rejects.toThrow('Commit failed');
  expect(publishGameStateUpdated).not.toHaveBeenCalled();
  expect(publishReadyStateUpdated).not.toHaveBeenCalled();
});

it('rejects invalid scope before any Redis operation', async () => {
  await expect(getGameSnapshotFromRedis('bad:board', 'map')).rejects.toThrow('A valid board ID and map ID are required');
  await expect(restoreGameSnapshotInRedis('', 'map', {})).rejects.toThrow('A valid board ID and map ID are required');
  expect(client.scan).not.toHaveBeenCalled();
  expect(client.multi).not.toHaveBeenCalled();
});
