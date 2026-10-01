/** @jest-environment node */
import { checkAllPlayersReady, processGameTurn, runGameActionsBetweenTurns } from './game-runner';
import * as redis from '../store/redis-access';
import { runGameActions } from './game-actions';
import { executeProcessesBetweenTurns, executeProcessesForTurn } from './game-processes';
import { populateMonsters } from './populate-monsters';
import { createGame, createMonster, createNpc, createParams, createPlayer } from './test-support/fixtures';
import { applyCharacterInventory, applyPlayerInventory } from './apply-inventory';
import { applyPlayerAddedStats } from './level-up';

jest.mock('../store/redis-access', () => ({
  getGameStateFromRedis: jest.fn(), commitGameTurnInRedis: jest.fn(), commitPausedGameInRedis: jest.fn(),
  getActionsStateFromRedis: jest.fn(), setReadyStateInRedis: jest.fn(), getLocationsStateFromRedis: jest.fn(),
  getPlayerTurnInputsFromRedis: jest.fn(), lockGameStateInRedis: jest.fn(), lockReadyStateInRedis: jest.fn(),
  getCharacterInventoriesFromRedis: jest.fn(),
  publishGameProcessingStarted: jest.fn(), publishGameProcessingFailed: jest.fn(), publishGameStateUpdated: jest.fn(),
  publishReadyStateUpdated: jest.fn(), getReadyStateFromRedis: jest.fn(), lockForProcessing: jest.fn(),
  getProcessingTurnFromRedis: jest.fn(), setProcessingTurnInRedis: jest.fn(), processingLockTTL: 60,
  RedisLockError: class RedisLockError extends Error {},
}));
jest.mock('./game-actions', () => ({ runGameActions: jest.fn() }));
jest.mock('./apply-inventory', () => ({
  ...jest.requireActual('./apply-inventory'), applyPlayerInventory: jest.fn(),
  applyCharacterInventory: jest.fn(jest.requireActual('./apply-inventory').applyCharacterInventory),
}));
jest.mock('./level-up', () => ({ levelUpPlayer: jest.fn(), applyPlayerAddedStats: jest.fn() }));
jest.mock('./game-processes', () => ({ initialiseProcessesForTurn: jest.fn(), executeProcessesForTurn: jest.fn(), executeProcessesBetweenTurns: jest.fn() }));
jest.mock('./populate-monsters', () => ({ populateMonsters: jest.fn() }));

const releaseGame = jest.fn(async () => {});
const releaseProcessing = jest.fn(async () => {});
const releaseReady = jest.fn(async () => {});

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(redis.lockForProcessing).mockResolvedValue(releaseProcessing);
  jest.mocked(redis.lockGameStateInRedis).mockResolvedValue(releaseGame);
  jest.mocked(redis.lockReadyStateInRedis).mockResolvedValue(releaseReady);
  jest.mocked(redis.getGameStateFromRedis).mockResolvedValue(createGame());
  jest.mocked(redis.getReadyStateFromRedis).mockResolvedValue({ readyPlayerIds: [] });
  jest.mocked(redis.getLocationsStateFromRedis).mockResolvedValue({ monsters: [], items: [], coins: [], npcs: [], blockedMoves: [] });
  jest.mocked(populateMonsters).mockResolvedValue([]);
  jest.mocked(applyCharacterInventory).mockImplementation(jest.requireActual('./apply-inventory').applyCharacterInventory);
  jest.mocked(redis.getCharacterInventoriesFromRedis).mockImplementation(async (_boardId, _mapId, ids) =>
    Object.fromEntries(ids.map(id => [id, { equipment: null, equipped: null }])),
  );
  jest.mocked(redis.getPlayerTurnInputsFromRedis).mockImplementation(async (_boardId, _mapId, playerIds) =>
    Object.fromEntries(playerIds.map(id => [id, {
      inventory: { equipped: null, equipment: null, hiredNpcIds: [] },
      addedStats: { characterStats: null },
      actions: { actions: [] },
    }])),
  );
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

it('releases all locks without processing an unready game', async () => {
  await checkAllPlayersReady('board', 'map');
  expect(redis.commitGameTurnInRedis).not.toHaveBeenCalled();
  expect(releaseGame).toHaveBeenCalledTimes(1);
  expect(releaseProcessing).toHaveBeenCalledTimes(1);
  expect(releaseReady).toHaveBeenCalledTimes(1);
  expect(releaseProcessing.mock.invocationCallOrder[0]).toBeLessThan(releaseReady.mock.invocationCallOrder[0]);
});

it('commits a ready turn, releasing readiness before execution and other locks before notifications', async () => {
  jest.mocked(redis.getReadyStateFromRedis).mockResolvedValue({ readyPlayerIds: ['hero'] });
  await checkAllPlayersReady('board', 'map');
  expect(redis.commitGameTurnInRedis).toHaveBeenCalledTimes(1);
  expect(releaseReady.mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(runGameActions).mock.invocationCallOrder[0]);
  expect(releaseProcessing.mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(redis.publishGameStateUpdated).mock.invocationCallOrder[0]);
  expect(redis.publishReadyStateUpdated).toHaveBeenCalledWith('board', 'map', { readyPlayerIds: [] });
});

it('treats an occupied processing lock as a deferred readiness check', async () => {
  jest.mocked(redis.lockForProcessing).mockRejectedValue(new redis.RedisLockError());
  await expect(checkAllPlayersReady('board', 'map')).resolves.toBeUndefined();
  expect(redis.lockGameStateInRedis).not.toHaveBeenCalled();
  expect(releaseProcessing).not.toHaveBeenCalled();
});

it('releases an acquired processing lock when obtaining the game lock fails', async () => {
  const error = new Error('Redis down');
  jest.mocked(redis.lockGameStateInRedis).mockRejectedValue(error);
  await expect(checkAllPlayersReady('board', 'map')).rejects.toBe(error);
  expect(releaseProcessing).toHaveBeenCalledTimes(1);
});

it('clears respawn delays in an all-dead game without advancing the turn', async () => {
  const game = createGame();
  game.players[0].health = 0;
  game.players[0].respawnTurns = 4;
  jest.mocked(redis.getGameStateFromRedis).mockResolvedValue(game);
  await checkAllPlayersReady('board', 'map');
  expect(game.players[0].respawnTurns).toBe(0);
  expect(game.turn).toBe(3);
  expect(redis.commitPausedGameInRedis).toHaveBeenCalledWith('board', 'map', game, []);
  expect(runGameActions).not.toHaveBeenCalled();
});

it('does not report a committed turn as failed when publishing its update fails', async () => {
  jest.mocked(redis.getReadyStateFromRedis).mockResolvedValue({ readyPlayerIds: ['hero'] });
  jest.mocked(redis.publishGameStateUpdated).mockRejectedValue(new Error('publish failed'));
  await expect(checkAllPlayersReady('board', 'map')).resolves.toBeUndefined();
  expect(redis.commitGameTurnInRedis).toHaveBeenCalledTimes(1);
  expect(redis.publishGameProcessingFailed).not.toHaveBeenCalled();
});

it('expires effects and summons, records portals, and commits destroyed shops with the turn', async () => {
  const params = createParams({ monsters: [createMonster({ effects: [{ description: 'Slow', turns: 1 }] })] });
  params.gameState.portals = [1];
  params.gameState.players[0].effects = [{ description: 'Old', turns: 1 }, { description: 'New', turns: 3 }];
  params.gameState.npcs = [createNpc({ id: 'summon', turnsLeft: 1, expiryAction: 'remove' }),
    createNpc({ id: 'undead', turnsLeft: 1, expiryAction: 'dead', monsterType: 'rat' })];
  jest.mocked(executeProcessesForTurn).mockImplementation(async p => { p.gameState.stores = []; });
  await processGameTurn(params);
  expect(params.gameState.turn).toBe(4);
  expect(params.gameState.players[0].effects).toEqual([{ description: 'New', turns: 2 }]);
  expect(params.monsters[0].effects).toEqual([]);
  expect(params.gameState.npcs).toEqual([]);
  expect(params.monsters).toContainEqual(expect.objectContaining({ id: 'undead', health: 0, type: 'rat' }));
  expect(params.gameState.visitedPortals).toEqual([1]);
  expect(redis.commitGameTurnInRedis).toHaveBeenCalledWith('board', 'map', params.gameState,
    expect.objectContaining({ monsters: params.monsters, npcs: [] }), params.messages, [1], ['summon', 'undead']);
});

it('applies pending NPC inventory before combat and consumes it even if the NPC expires', async () => {
  const npc = createNpc({ id: 'follower', turnsLeft: 1, expiryAction: 'remove' });
  const params = createParams();
  params.gameState.npcs = [npc];
  const sword = { id: 'steel', type: 'swordSteel' };
  jest.mocked(redis.getCharacterInventoriesFromRedis).mockResolvedValue({
    follower: { equipment: [sword], equipped: { weapon: sword.id } },
  });
  jest.mocked(runGameActions).mockImplementation(async p => {
    expect(p.gameState.npcs[0].equipment).toEqual([sword]);
    expect(p.gameState.npcs[0].equipped.weapon).toBe(sword.id);
  });
  await processGameTurn(params);
  expect(params.gameState.npcs).toEqual([]);
  expect(redis.commitGameTurnInRedis).toHaveBeenCalledWith('board', 'map', params.gameState,
    expect.objectContaining({ npcs: [] }), params.messages, [], ['follower']);
});

it('preserves the original processing error even if recovery also fails', async () => {
  const error = new Error('action failed');
  jest.mocked(redis.getReadyStateFromRedis).mockResolvedValue({ readyPlayerIds: ['hero'] });
  jest.mocked(runGameActions).mockRejectedValue(error);
  jest.mocked(redis.setReadyStateInRedis).mockRejectedValue(new Error('recovery failed'));
  await expect(checkAllPlayersReady('board', 'map')).rejects.toBe(error);
  expect(redis.publishGameProcessingFailed).toHaveBeenCalledWith('board', 'map');
  expect(releaseProcessing.mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(redis.publishGameProcessingFailed).mock.invocationCallOrder[0]);
  expect(redis.commitGameTurnInRedis).not.toHaveBeenCalled();
});

it('applies batched inputs in player order before passing actions to combat', async () => {
  const params = createParams();
  params.gameState.players.push(createPlayer({ id: 'second' }));
  const inputs = {
    hero: { inventory: { equipped: null, equipment: null, coins: 0 }, addedStats: { characterStats: null }, actions: { actions: [] } },
    second: { inventory: { equipped: null, equipment: [], coins: 7 }, addedStats: { characterStats: null }, actions: { actions: [] } },
  };
  jest.mocked(redis.getPlayerTurnInputsFromRedis).mockResolvedValue(inputs);
  const order: string[] = [];
  jest.mocked(applyPlayerInventory).mockImplementation(async (_params, player) => { order.push(`inventory:${player.id}`); });
  jest.mocked(applyPlayerAddedStats).mockImplementation(async (_params, player) => { order.push(`stats:${player.id}`); });
  jest.mocked(runGameActions).mockImplementation(async () => { order.push('actions'); });

  await processGameTurn(params);

  expect(redis.getPlayerTurnInputsFromRedis).toHaveBeenCalledTimes(1);
  expect(redis.getPlayerTurnInputsFromRedis).toHaveBeenCalledWith('board', 'map', ['hero', 'second']);
  expect(order).toEqual(['inventory:hero', 'stats:hero', 'inventory:second', 'stats:second', 'actions']);
  for (const player of params.gameState.players) {
    const input = inputs[player.id as keyof typeof inputs];
    expect(applyPlayerInventory).toHaveBeenCalledWith(params, player, input.inventory);
    expect(applyPlayerAddedStats).toHaveBeenCalledWith(params, player, input.addedStats);
  }
  expect(runGameActions).toHaveBeenCalledWith(params, { hero: inputs.hero.actions, second: inputs.second.actions });
  expect(redis.getActionsStateFromRedis).not.toHaveBeenCalled();
});

it('recovers without committing when the batched input read fails', async () => {
  const error = new Error('Read failed');
  jest.mocked(redis.getReadyStateFromRedis).mockResolvedValue({ readyPlayerIds: ['hero'] });
  jest.mocked(redis.getPlayerTurnInputsFromRedis).mockRejectedValue(error);
  await expect(checkAllPlayersReady('board', 'map')).rejects.toBe(error);
  expect(applyPlayerInventory).not.toHaveBeenCalled();
  expect(runGameActions).not.toHaveBeenCalled();
  expect(redis.commitGameTurnInRedis).not.toHaveBeenCalled();
  expect(redis.publishGameProcessingFailed).toHaveBeenCalledWith('board', 'map');
  expect(redis.setReadyStateInRedis).toHaveBeenCalledWith('board', 'map', { readyPlayerIds: [] }, { notify: false });
});

it.each([false, true])('releases the state lock while start delivery is pending, keeping turns ordered (failure=%s)', async fails => {
  jest.mocked(redis.getReadyStateFromRedis).mockResolvedValue({ readyPlayerIds: ['hero'] });
  let finishStart!: () => void;
  const startedNotification = new Promise<void>(resolve => { finishStart = resolve; });
  jest.mocked(redis.publishGameProcessingStarted).mockReturnValue(startedNotification);
  const error = new Error('action failed');
  if (fails) jest.mocked(runGameActions).mockRejectedValue(error);
  let locksReleased!: () => void;
  const released = new Promise<void>(resolve => { locksReleased = resolve; });
  releaseGame.mockImplementation(async () => { locksReleased(); });

  const processing = checkAllPlayersReady('board', 'map');
  const outcome = fails ? expect(processing).rejects.toBe(error) : expect(processing).resolves.toBeUndefined();
  await released;
  expect(runGameActions).toHaveBeenCalledTimes(1);
  expect(releaseGame).toHaveBeenCalledTimes(1);
  expect(releaseReady).toHaveBeenCalledTimes(1);
  expect(releaseProcessing).not.toHaveBeenCalled();
  expect(redis.commitGameTurnInRedis).toHaveBeenCalledTimes(fails ? 0 : 1);
  expect(redis.publishGameStateUpdated).not.toHaveBeenCalled();
  expect(redis.publishGameProcessingFailed).not.toHaveBeenCalled();
  expect(redis.publishReadyStateUpdated).not.toHaveBeenCalled();

  finishStart();
  await outcome;
  expect(releaseProcessing).toHaveBeenCalledTimes(1);
  expect(redis.publishReadyStateUpdated).toHaveBeenCalledWith('board', 'map', { readyPlayerIds: [] });
  expect(redis.publishGameProcessingFailed).toHaveBeenCalledTimes(fails ? 1 : 0);
  expect(redis.publishGameStateUpdated).toHaveBeenCalledTimes(fails ? 0 : 1);
  expect(releaseProcessing.mock.invocationCallOrder[0])
    .toBeLessThan(jest.mocked(redis.publishReadyStateUpdated).mock.invocationCallOrder[0]);
});

it('still commits the turn when publishing the start fails', async () => {
  jest.mocked(redis.getReadyStateFromRedis).mockResolvedValue({ readyPlayerIds: ['hero'] });
  jest.mocked(redis.publishGameProcessingStarted).mockRejectedValue(new Error('publish failed'));
  await expect(checkAllPlayersReady('board', 'map')).resolves.toBeUndefined();
  expect(redis.commitGameTurnInRedis).toHaveBeenCalledTimes(1);
  expect(redis.publishGameStateUpdated).toHaveBeenCalledTimes(1);
  expect(redis.publishGameProcessingFailed).not.toHaveBeenCalled();
});

it.each([2, 3])('runs between-turn work once per turn and always rechecks readiness (last %i)', async turn => {
  jest.mocked(redis.getProcessingTurnFromRedis).mockResolvedValue({ turn });
  await runGameActionsBetweenTurns('board', 'map');
  expect(executeProcessesBetweenTurns).toHaveBeenCalledTimes(turn === 3 ? 0 : 1);
  expect(redis.setProcessingTurnInRedis).toHaveBeenCalledTimes(turn === 3 ? 0 : 1);
  expect(redis.getReadyStateFromRedis).toHaveBeenCalledTimes(1);
  expect(releaseProcessing).toHaveBeenCalledTimes(2);
});
