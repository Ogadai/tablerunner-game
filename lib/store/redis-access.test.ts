/** @jest-environment node */
import { Redis } from '@upstash/redis';
import * as store from './redis-access';
import { publishMessage } from '../messages/message-publisher';
import { createGame, createLocations, createNpc, createPlayer } from './test-support/fixtures';

jest.mock('@upstash/redis', () => ({ Redis: { fromEnv: jest.fn(() => ({ get: jest.fn(), mget: jest.fn(), set: jest.fn(), del: jest.fn(), eval: jest.fn(), multi: jest.fn() })) } }));
jest.mock('../messages/message-publisher', () => ({ publishMessage: jest.fn() }));
const client = jest.mocked(Redis.fromEnv).mock.results[0].value as {
  get: jest.Mock; mget: jest.Mock; set: jest.Mock; del: jest.Mock; eval: jest.Mock; multi: jest.Mock;
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
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it('reads player and NPC inventories together, preserving empty pending inventories', async () => {
  client.mget.mockResolvedValue([null, { equipment: [], equipped: {} }]);
  await expect(store.getCharacterInventoriesFromRedis('b', 'm', ['hero', 'npc'])).resolves.toEqual({
    hero: { equipment: null, equipped: null }, npc: { equipment: [], equipped: {} },
  });
  expect(client.mget).toHaveBeenCalledWith('playerInventory:b:m:hero', 'playerInventory:b:m:npc');
});

it('saves both sides of a transfer in one transaction', async () => {
  const playerInventory = { equipment: [], equipped: {} };
  const npcInventory = { equipment: [{ id: 'sword', type: 'swordRusty' }], equipped: { weapon: 'sword' } };
  await store.setCharacterInventoriesInRedis('b', 'm', { hero: playerInventory, npc: npcInventory });
  expect(transaction.set.mock.calls).toEqual([
    ['playerInventory:b:m:hero', playerInventory, expiry], ['playerInventory:b:m:npc', npcInventory, expiry],
  ]);
  expect(transaction.exec).toHaveBeenCalledTimes(1);
  expect(client.set).not.toHaveBeenCalled();
});

it('clears consumed NPC inventories with the turn even when the NPC no longer exists', async () => {
  await store.commitGameTurnInRedis('b', 'm', createGame(), createLocations(), { hero: { messages: [] } }, [], ['expired-npc']);
  expect(transaction.del).toHaveBeenCalledWith('playerInventory:b:m:expired-npc');
  expect(transaction.exec).toHaveBeenCalledTimes(1);
  expect(client.del).not.toHaveBeenCalled();
});

it('reads a player snapshot in one batch and returns only the current location', async () => {
  const game = createGame();
  const inventory = { equipped: {}, equipment: [], coins: 0 };
  const actions = { actions: [{ id: 1, type: 'respawn', description: 'Respawn' }] };
  const addedStats = { characterStats: { strength: 1 } };
  const messages = { messages: [{ text: 'Next turn' }] };
  const instructions = { team: 'blue' };
  const npc = createNpc();
  const locations = createLocations({
    monsters: [{ id: 'rat', type: 'rat', location: 1, health: 2, team: 'monster' },
      { id: 'other', type: 'rat', location: 2, health: 2, team: 'monster' }],
    items: [{ id: 'here', type: 'swordRusty', location: 1 }, { id: 'there', type: 'swordRusty', location: 2 }],
    npcs: [npc, createNpc({ id: 'other-npc', location: { id: 2, description: '', move: [] } })],
  });
  client.mget.mockResolvedValue([game, inventory, actions, addedStats, locations, messages, instructions]);

  await expect(store.getPlayerSnapshotFromRedis('b', 'm', 'hero')).resolves.toEqual({
    playerId: 'hero', gameState: game, inventory, actions, addedStats, messages, instructions,
    location: { monsters: [locations.monsters[0]], items: [locations.items[0]], npcs: [npc] },
  });
  expect(client.mget).toHaveBeenCalledTimes(1);
  expect(client.mget).toHaveBeenCalledWith('game:b:m', 'playerInventory:b:m:hero', 'playerActions:b:m:hero',
    'playerStats:b:m:hero', 'monsters:b:m', 'playerMessages:b:m:hero', 'playerInstructions:b:m:hero');
  expect(client.get).not.toHaveBeenCalled();
});

it.each([null, createGame(), createGame({ players: [] })])('supplies snapshot defaults for missing state', async gameState => {
  client.mget.mockResolvedValue([gameState, null, null, null, null, null, null]);
  await expect(store.getPlayerSnapshotFromRedis('b', 'm', 'hero')).resolves.toEqual({
    playerId: 'hero', gameState,
    inventory: { equipped: null, equipment: null, hiredNpcIds: [] },
    actions: { actions: [] }, addedStats: { characterStats: null },
    instructions: {},
    location: { monsters: [], items: [], npcs: [] }, messages: { messages: [] },
  });
});

it('propagates a failed snapshot read', async () => {
  client.mget.mockRejectedValue(new Error('Read failed'));
  await expect(store.getPlayerSnapshotFromRedis('b', 'm', 'hero')).rejects.toThrow('Read failed');
});

it('fetches four players in one batch and preserves each input and missing-state default', async () => {
  const inventory = { equipped: {}, equipment: [], coins: 0, hiredNpcIds: ['npc'] };
  const addedStats = { characterStats: { strength: 1 } };
  const actions = { actions: [{ id: 1, type: 'respawn', description: '' }] };
  const instructions = { team: 'blue' };
  const otherInstructions = { team: 'red', options: { ready: true } };
  client.mget.mockResolvedValue([
    inventory, null, actions, instructions,
    null, addedStats, null, null,
    null, null, null, null,
    inventory, addedStats, actions, otherInstructions,
  ]);

  const inputs = await store.getPlayerTurnInputsFromRedis('b', 'm', ['p1', 'p2', 'p3', 'p4']);

  expect(client.mget).toHaveBeenCalledTimes(1);
  expect(client.mget).toHaveBeenCalledWith(
    'playerInventory:b:m:p1', 'playerStats:b:m:p1', 'playerActions:b:m:p1', 'playerInstructions:b:m:p1',
    'playerInventory:b:m:p2', 'playerStats:b:m:p2', 'playerActions:b:m:p2', 'playerInstructions:b:m:p2',
    'playerInventory:b:m:p3', 'playerStats:b:m:p3', 'playerActions:b:m:p3', 'playerInstructions:b:m:p3',
    'playerInventory:b:m:p4', 'playerStats:b:m:p4', 'playerActions:b:m:p4', 'playerInstructions:b:m:p4',
  );
  expect(inputs).toEqual({
    p1: { inventory, addedStats: { characterStats: null }, actions, instructions },
    p2: { inventory: { equipped: null, equipment: null, hiredNpcIds: [] }, addedStats, actions: { actions: [] }, instructions: {} },
    p3: { inventory: { equipped: null, equipment: null, hiredNpcIds: [] }, addedStats: { characterStats: null }, actions: { actions: [] }, instructions: {} },
    p4: { inventory, addedStats, actions, instructions: otherInstructions },
  });
  expect(inputs.p2.actions.actions).not.toBe(inputs.p3.actions.actions);
  expect(inputs.p2.instructions).not.toBe(inputs.p3.instructions);
  expect(client.get).not.toHaveBeenCalled();
});

it('persists counter-only game changes without broadcasting a game update', async () => {
  const game = createGame();
  game.counters.itemId++;
  await store.setGameStateInRedis('b', 'm', game, { notify: false });
  expect(client.set).toHaveBeenCalledWith('game:b:m', game, expiry);
  expect(publishMessage).not.toHaveBeenCalled();
});

it('skips Redis when there are no player inputs to fetch', async () => {
  await expect(store.getPlayerTurnInputsFromRedis('b', 'm', [])).resolves.toEqual({});
  expect(client.mget).not.toHaveBeenCalled();
});

it('propagates a failed batched input read', async () => {
  const error = new Error('Read failed');
  client.mget.mockRejectedValue(error);
  await expect(store.getPlayerTurnInputsFromRedis('b', 'm', ['p'])).rejects.toBe(error);
});

const reads = [
  ['game', () => store.getGameStateFromRedis('b', 'm'), null],
  ['playersReady', () => store.getReadyStateFromRedis('b', 'm'), { readyPlayerIds: [] }],
  ['playerActions', () => store.getActionsStateFromRedis('b', 'm', 'p'), { actions: [] }],
  ['npcActions', () => store.getMonsterActionsStateFromRedis('b', 'm', 'p'), null],
  ['playerStats', () => store.getPlayerStatsFromRedis('b', 'm', 'p'), { characterStats: null }],
  ['playerInventory', () => store.getPlayerInventoryFromRedis('b', 'm', 'p'), { equipped: null, equipment: null, hiredNpcIds: [] }],
  ['playerMessages', () => store.getPlayerMessagesFromRedis('b', 'm', 'p'), { messages: [] }],
  ['playerInstructions', () => store.getPlayerInstructionsFromRedis('b', 'm', 'p'), {}],
  ['monsters', () => store.getLocationsStateFromRedis('b', 'm'), createLocations()],
  ['store', () => store.getStoreStateFromRedis('b', 'm', 1), { items: [] }],
  ['boardSettings', () => store.getBoardSettingsFromRedis('b', 'm'), { brightness: 50 }],
  ['processingTurn', () => store.getProcessingTurnFromRedis('b', 'm'), { turn: 0 }],
] as const;

function key(type: string) {
  return `${type}:b:m${['playerActions', 'npcActions', 'playerStats', 'playerInventory', 'playerMessages', 'playerInstructions'].includes(type) ? ':p' : type === 'store' ? ':1' : ''}`;
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
  ['playerInstructions', () => store.setPlayerInstructionsInRedis('b', 'm', 'p', { team: 'blue' }), { team: 'blue' }],
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
  ['playerInstructions', () => store.deletePlayerInstructionsFromRedis('b', 'm', 'p')],
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

it('can save readiness without waiting for notification delivery', async () => {
  const ready = { readyPlayerIds: ['hero'] };
  await store.setReadyStateInRedis('b', 'm', ready, { notify: false });
  expect(client.set).toHaveBeenCalledWith('playersReady:b:m', ready, expiry);
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
      { id: 'boss', type: 'rat', health: 10, location: 1, scriptedActions: true, team: 'monster' },
      { id: 'rat', type: 'rat', health: 5, location: 1, team: 'monster' },
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
      ['playerInventory:b:m:hero'], ['playerInstructions:b:m:hero'],
      ['playerInventory:b:m:other'], ['playerInstructions:b:m:other'], ['npcActions:b:m:boss'], ['store:b:m:5'],
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
    ['playerActionsLock:b:m:hero', () => store.lockPlayerActionsInRedis('b', 'm', 'hero'), 5000],
    ['playerActionsLock:b:m:hero', () => store.lockPlayerActionsInRedis('b', 'm', 'hero', 30000, 0), 30000],
  ] as const)('acquires and atomically releases %s (case %#)', async (type, lock, ttl) => {
    const release = await lock();
    const token = client.set.mock.calls[0][1];
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
    const key = type.startsWith('playerActionsLock:') ? type : `${type}:b:m`;
    expect(client.set).toHaveBeenCalledWith(key, token, { nx: true, px: ttl });
    await release();
    expect(client.eval).toHaveBeenCalledWith(expect.stringContaining('redis.call("get", KEYS[1]) == ARGV[1]'), [key], [token]);
    expect(client.eval.mock.calls[0][0]).toContain('return redis.call("del", KEYS[1])');
    expect(client.del).not.toHaveBeenCalled();
  });

  it('throws a recognizable lock error when already held', async () => {
    client.set.mockResolvedValue(null);
    await expect(store.lockGameStateInRedis('b', 'm', 5000, 0)).rejects.toBeInstanceOf(store.RedisLockError);
    expect(client.set).toHaveBeenCalledTimes(1);
    expect(client.eval).not.toHaveBeenCalled();
  });

  it('keeps processing locks fail-fast', async () => {
    client.set.mockResolvedValue(null);
    await expect(store.lockForProcessing('b', 'm')).rejects.toBeInstanceOf(store.RedisLockError);
    expect(client.set).toHaveBeenCalledTimes(1);
  });

  it.each([
    () => store.lockGameStateInRedis('b', 'm'),
    () => store.lockReadyStateInRedis('b', 'm'),
    () => store.lockLocationsStateInRedis('b', 'm'),
    () => store.lockStoreStateInRedis('b', 'm'),
    () => store.lockPlayerActionsInRedis('b', 'm', 'hero'),
  ])('retries a user lock and releases it using the acquired token', async lock => {
    jest.useFakeTimers();
    client.set.mockResolvedValueOnce(null).mockResolvedValueOnce('OK');
    const pending = lock();
    await jest.advanceTimersByTimeAsync(50);
    const release = await pending;
    expect(client.set).toHaveBeenCalledTimes(2);
    expect(client.set.mock.calls[1]).toEqual(client.set.mock.calls[0]);
    await release();
    expect(client.eval).toHaveBeenCalledWith(expect.any(String),
      [client.set.mock.calls[1][0]], [client.set.mock.calls[1][1]]);
  });

  it('stops retrying after one second without releasing another owner’s lock', async () => {
    jest.useFakeTimers();
    client.set.mockResolvedValue(null);
    const result = expect(store.lockGameStateInRedis('b', 'm')).rejects.toBeInstanceOf(store.RedisLockError);
    await jest.advanceTimersByTimeAsync(1000);
    await result;
    expect(client.set).toHaveBeenCalledTimes(20);
    expect(client.eval).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1000);
    expect(client.set).toHaveBeenCalledTimes(20);
  });

  it('propagates Redis errors without retrying', async () => {
    client.set.mockRejectedValue(new Error('Redis unavailable'));
    await expect(store.lockGameStateInRedis('b', 'm')).rejects.toThrow('Redis unavailable');
    expect(client.set).toHaveBeenCalledTimes(1);
  });

  it('uses a different owner token for each acquisition', async () => {
    await store.lockGameStateInRedis('b', 'm');
    await store.lockGameStateInRedis('b', 'm');
    expect(client.set.mock.calls[0][1]).not.toBe(client.set.mock.calls[1][1]);
  });

  it('uses separate action lock keys for different players', async () => {
    const releaseHero = await store.lockPlayerActionsInRedis('b', 'm', 'hero');
    const releaseMage = await store.lockPlayerActionsInRedis('b', 'm', 'mage');
    expect(client.set.mock.calls.map(call => call[0])).toEqual([
      'playerActionsLock:b:m:hero', 'playerActionsLock:b:m:mage',
    ]);
    await releaseHero();
    await releaseMage();
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
      { id: 'boss', type: 'rat', health: 1, location: 1, scriptedActions: true, team: 'monster' },
      { id: 'normal', type: 'rat', health: 1, location: 1, team: 'monster' },
    ] }));
    await store.deleteGameStateFromRedis('b', 'm');
    expect(client.del.mock.calls.map(([key]) => key).sort()).toEqual([
      'game:b:m', 'playersReady:b:m', 'playerActions:b:m:hero', 'playerMessages:b:m:hero',
      'playerStats:b:m:hero', 'playerInventory:b:m:hero', 'playerInstructions:b:m:hero', 'store:b:m:1', 'npcActions:b:m:boss',
      'playerMessages:b:m:boss', 'monsters:b:m', 'processingTurn:b:m',
    ].sort());
    expect(publishMessage).toHaveBeenCalledWith('b', 'm', { type: 'game_state_updated' });
  });
});
