/** @jest-environment node */
import { Redis } from '@upstash/redis';
import * as store from './redis-access';
import { publishMessage } from '../messages/message-publisher';
import { createGame, createLocations, createPlayer } from './test-support/fixtures';

jest.mock('@upstash/redis', () => ({ Redis: { fromEnv: jest.fn(() => ({ get: jest.fn(), set: jest.fn(), del: jest.fn(), eval: jest.fn(), multi: jest.fn() })) } }));
jest.mock('../messages/message-publisher', () => ({ publishMessage: jest.fn() }));
const client = jest.mocked(Redis.fromEnv).mock.results[0].value as {
  get: jest.Mock; set: jest.Mock; del: jest.Mock; eval: jest.Mock; multi: jest.Mock;
};
const transaction = { set: jest.fn(), del: jest.fn(), exec: jest.fn() };
const expiry = { ex: 604800 };

beforeEach(() => {
  jest.resetAllMocks();
  client.multi.mockReturnValue(transaction);
  transaction.exec.mockResolvedValue([]);
  client.get.mockResolvedValue(null);
  client.set.mockResolvedValue('OK');
});
afterEach(() => jest.restoreAllMocks());

const reads = [
  ['game', () => store.getGameStateFromRedis('b', 'm'), null],
  ['playersReady', () => store.getReadyStateFromRedis('b', 'm'), { readyPlayerIds: [] }],
  ['playerActions', () => store.getActionsStateFromRedis('b', 'm', 'p'), { actions: [] }],
  ['npcActions', () => store.getMonsterActionsStateFromRedis('b', 'm', 'p'), null],
  ['playerStats', () => store.getPlayerStatsFromRedis('b', 'm', 'p'), { characterStats: null }],
  ['playerInventory', () => store.getPlayerInventoryFromRedis('b', 'm', 'p'), { equipped: null, equipment: null, hiredNpcIds: [] }],
  ['playerMessages', () => store.getPlayerMessagesFromRedis('b', 'm', 'p'), { messages: [] }],
  ['monsters', () => store.getLocationsStateFromRedis('b', 'm'), createLocations()],
  ['store', () => store.getStoreStateFromRedis('b', 'm', 1), { items: [] }],
  ['boardSettings', () => store.getBoardSettingsFromRedis('b', 'm'), { brightness: 50 }],
  ['processingTurn', () => store.getProcessingTurnFromRedis('b', 'm'), { turn: 0 }],
] as const;

function key(type: string) {
  return `${type}:b:m${['playerActions', 'npcActions', 'playerStats', 'playerInventory', 'playerMessages'].includes(type) ? ':p' : type === 'store' ? ':1' : ''}`;
}

it.each(reads)('reads %s using its scoped key and supplies its missing-state default', async (type, read, fallback) => {
  await expect(read()).resolves.toEqual(fallback);
  expect(client.get).toHaveBeenCalledWith(key(type));
  const persisted = { persisted: true };
  client.get.mockResolvedValue(persisted);
  await expect(read()).resolves.toBe(persisted);
  client.get.mockRejectedValue(new Error('Read failed'));
  await expect(read()).rejects.toThrow('Read failed');
});

const writes = [
  ['playerActions', () => store.setActionsStateInRedis('b', 'm', 'p', { actions: [] }), { actions: [] }],
  ['npcActions', () => store.setMonsterActionsStateInRedis('b', 'm', 'p', { actions: [] }), { actions: [] }],
  ['playerStats', () => store.setPlayerStatsInRedis('b', 'm', 'p', { characterStats: null }), { characterStats: null }],
  ['playerInventory', () => store.setPlayerInventoryInRedis('b', 'm', 'p', { equipped: null, equipment: null }), { equipped: null, equipment: null }],
  ['playerMessages', () => store.setPlayerMessagesInRedis('b', 'm', 'p', { messages: [] }), { messages: [] }],
  ['monsters', () => store.setLocationsStateInRedis('b', 'm', createLocations()), createLocations()],
  ['store', () => store.setStoreStateInRedis('b', 'm', 1, { items: [] }), { items: [] }],
  ['boardSettings', () => store.setBoardSettingsFromRedis('b', 'm', { brightness: 0 }), { brightness: 0 }],
  ['processingTurn', () => store.setProcessingTurnInRedis('b', 'm', { turn: 3 }), { turn: 3 }],
] as const;

it.each(writes)('writes %s with a one-week expiry', async (type, write, value) => {
  await write();
  expect(client.set).toHaveBeenCalledWith(key(type), value, expiry);
  expect(publishMessage).not.toHaveBeenCalled();
  client.set.mockRejectedValue(new Error('Write failed'));
  await expect(write()).rejects.toThrow('Write failed');
});

it.each([
  ['playersReady', () => store.deleteReadyStateFromRedis('b', 'm')],
  ['playerActions', () => store.deleteActionsStateFromRedis('b', 'm', 'p')],
  ['npcActions', () => store.deleteMonsterActionsStateFromRedis('b', 'm', 'p')],
  ['playerStats', () => store.deletePlayerStatsFromRedis('b', 'm', 'p')],
  ['playerInventory', () => store.deletePlayerInventoryFromRedis('b', 'm', 'p')],
  ['playerMessages', () => store.deletePlayerMessagesFromRedis('b', 'm', 'p')],
  ['monsters', () => store.deleteLocationsStateFromRedis('b', 'm')],
  ['store', () => store.deleteStoreStateFromRedis('b', 'm', 1)],
  ['processingTurn', () => store.deleteProcessingTurnFromRedis('b', 'm')],
] as const)('deletes only the requested %s key', async (type, remove) => {
  await remove();
  expect(client.del.mock.calls).toEqual([[key(type)]]);
});

it('persists game and readiness before notifying subscribers', async () => {
  const game = createGame();
  const ready = { readyPlayerIds: ['p'], readyPlayerDirection: { p: 'n' as const } };
  client.set.mockImplementation(async () => { expect(publishMessage).not.toHaveBeenCalled(); });
  await store.setGameStateInRedis('b', 'm', game);
  expect(client.set).toHaveBeenCalledWith('game:b:m', game, expiry);
  expect(publishMessage).toHaveBeenCalledWith('b', 'm', { type: 'game_state_updated' });
  jest.mocked(publishMessage).mockClear();
  await store.setReadyStateInRedis('b', 'm', ready);
  expect(client.set).toHaveBeenCalledWith('playersReady:b:m', ready, expiry);
  expect(publishMessage).toHaveBeenCalledWith('b', 'm', { type: 'ready_state_updated', ...ready });
});

it('does not publish when persistence fails', async () => {
  client.set.mockRejectedValue(new Error('Write failed'));
  await expect(store.setGameStateInRedis('b', 'm', createGame())).rejects.toThrow('Write failed');
  await expect(store.setReadyStateInRedis('b', 'm', { readyPlayerIds: [] })).rejects.toThrow('Write failed');
  expect(publishMessage).not.toHaveBeenCalled();
});

it('publishes processing lifecycle messages', async () => {
  await store.publishGameProcessingStarted('b', 'm');
  await store.publishGameProcessingFailed('b', 'm');
  expect(jest.mocked(publishMessage).mock.calls).toEqual([
    ['b', 'm', { type: 'game_processing_started' }], ['b', 'm', { type: 'game_processing_failed' }],
  ]);
});

describe('turn transactions', () => {
  it('commits a paused game, clearing only readiness and respawned player actions', async () => {
    const game = createGame({ players: [createPlayer(), createPlayer({ id: 'other' })] });
    await store.commitPausedGameInRedis('b', 'm', game, ['hero']);
    expect(transaction.set.mock.calls).toEqual([
      ['game:b:m', game, expiry], ['playersReady:b:m', { readyPlayerIds: [] }, expiry],
      ['playerActions:b:m:hero', { actions: [] }, expiry],
    ]);
    expect(transaction.del).not.toHaveBeenCalled();
    expect(transaction.exec).toHaveBeenCalledTimes(1);
    expect(client.set).not.toHaveBeenCalled();
    expect(publishMessage).not.toHaveBeenCalled();
  });

  it('commits all turn results and consumes pending inputs in the same transaction', async () => {
    const game = createGame({ players: [createPlayer(), createPlayer({ id: 'other' })] });
    const locations = createLocations({ monsters: [
      { id: 'boss', type: 'rat', health: 10, location: 1, scriptedActions: true },
      { id: 'rat', type: 'rat', health: 5, location: 1 },
    ] });
    const messages = { hero: { messages: [{ text: 'Won' }] }, other: { messages: [] } };
    await store.commitGameTurnInRedis('b', 'm', game, locations, messages, [5]);
    expect(transaction.set.mock.calls).toEqual([
      ['game:b:m', game, expiry], ['monsters:b:m', locations, expiry],
      ['playersReady:b:m', { readyPlayerIds: [] }, expiry],
      ['playerActions:b:m:hero', { actions: [] }, expiry], ['playerStats:b:m:hero', { characterStats: null }, expiry],
      ['playerMessages:b:m:hero', messages.hero, expiry],
      ['playerActions:b:m:other', { actions: [] }, expiry], ['playerStats:b:m:other', { characterStats: null }, expiry],
      ['playerMessages:b:m:other', messages.other, expiry],
    ]);
    expect(transaction.del.mock.calls).toEqual([
      ['playerInventory:b:m:hero'], ['playerInventory:b:m:other'], ['npcActions:b:m:boss'], ['store:b:m:5'],
    ]);
    expect(transaction.exec).toHaveBeenCalledTimes(1);
    expect(client.set).not.toHaveBeenCalled();
    expect(client.del).not.toHaveBeenCalled();
    expect(publishMessage).not.toHaveBeenCalled();
  });

  it.each([
    () => store.commitPausedGameInRedis('b', 'm', createGame(), []),
    () => store.commitGameTurnInRedis('b', 'm', createGame(), createLocations(), { hero: { messages: [] } }, []),
  ])('propagates commit failures without writes outside the transaction', async commit => {
    transaction.exec.mockRejectedValue(new Error('Commit failed'));
    await expect(commit()).rejects.toThrow('Commit failed');
    expect(client.set).not.toHaveBeenCalled();
    expect(client.del).not.toHaveBeenCalled();
    expect(publishMessage).not.toHaveBeenCalled();
  });
});

describe('locks', () => {
  it.each([
    ['gameStateLock', () => store.lockGameStateInRedis('b', 'm'), 5000],
    ['gameStateLock', () => store.lockGameStateInRedis('b', 'm', 1234), 1234],
    ['playersReadyLock', () => store.lockReadyStateInRedis('b', 'm'), 5000],
    ['monstersLock', () => store.lockLocationsStateInRedis('b', 'm'), 5000],
    ['storeLock', () => store.lockStoreStateInRedis('b', 'm'), 5000],
    ['processingLock', () => store.lockForProcessing('b', 'm'), 30000],
  ] as const)('acquires and atomically releases %s (case %#)', async (type, lock, ttl) => {
    const release = await lock();
    const token = client.set.mock.calls[0][1];
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
    expect(client.set).toHaveBeenCalledWith(`${type}:b:m`, token, { nx: true, px: ttl });
    await release();
    expect(client.eval).toHaveBeenCalledWith(expect.stringContaining('redis.call("get", KEYS[1]) == ARGV[1]'), [`${type}:b:m`], [token]);
    expect(client.eval.mock.calls[0][0]).toContain('return redis.call("del", KEYS[1])');
    expect(client.del).not.toHaveBeenCalled();
  });

  it('throws a recognizable lock error when already held', async () => {
    client.set.mockResolvedValue(null);
    await expect(store.lockGameStateInRedis('b', 'm')).rejects.toBeInstanceOf(store.RedisLockError);
    expect(client.eval).not.toHaveBeenCalled();
  });

  it('uses a different owner token for each acquisition', async () => {
    await store.lockGameStateInRedis('b', 'm');
    await store.lockGameStateInRedis('b', 'm');
    expect(client.set.mock.calls[0][1]).not.toBe(client.set.mock.calls[1][1]);
  });

  it('logs release errors without masking a completed operation', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Release failed');
    const release = await store.lockGameStateInRedis('b', 'm');
    client.eval.mockRejectedValue(error);
    await expect(release()).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith('Error occurred releasing redis lock', error);
  });
});

describe('game deletion', () => {
  it('does nothing when the game is absent', async () => {
    await store.deleteGameStateFromRedis('b', 'm');
    expect(client.del).not.toHaveBeenCalled();
    expect(publishMessage).not.toHaveBeenCalled();
  });

  it('removes player, store, scripted monster and processing data before notifying subscribers', async () => {
    client.del.mockImplementation(async () => { expect(publishMessage).not.toHaveBeenCalled(); });
    client.get.mockResolvedValueOnce(createGame()).mockResolvedValueOnce(createLocations({ monsters: [
      { id: 'boss', type: 'rat', health: 1, location: 1, scriptedActions: true },
      { id: 'normal', type: 'rat', health: 1, location: 1 },
    ] }));
    await store.deleteGameStateFromRedis('b', 'm');
    expect(client.del.mock.calls.map(([key]) => key).sort()).toEqual([
      'game:b:m', 'playersReady:b:m', 'playerActions:b:m:hero', 'playerMessages:b:m:hero',
      'playerStats:b:m:hero', 'playerInventory:b:m:hero', 'store:b:m:1', 'npcActions:b:m:boss',
      'playerMessages:b:m:boss', 'monsters:b:m', 'processingTurn:b:m',
    ].sort());
    expect(publishMessage).toHaveBeenCalledWith('b', 'm', { type: 'game_state_updated' });
  });
});
