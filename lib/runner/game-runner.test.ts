/** @jest-environment node */
import { checkAllPlayersReady, processGameTurn, runGameActionsBetweenTurns } from './game-runner';
import * as redis from '../store/redis-access';
import { runGameActions } from './game-actions';
import { executeProcessesBetweenTurns, executeProcessesForTurn } from './game-processes';
import { populateMonsters } from './populate-monsters';
import { createGame, createMonster, createNpc, createParams } from './test-support/fixtures';

jest.mock('../store/redis-access', () => ({
  getGameStateFromRedis: jest.fn(), commitGameTurnInRedis: jest.fn(), commitPausedGameInRedis: jest.fn(),
  getActionsStateFromRedis: jest.fn(), setReadyStateInRedis: jest.fn(), getLocationsStateFromRedis: jest.fn(),
  getPlayerStatsFromRedis: jest.fn(), lockGameStateInRedis: jest.fn(), lockReadyStateInRedis: jest.fn(),
  publishGameProcessingStarted: jest.fn(), publishGameProcessingFailed: jest.fn(), publishGameStateUpdated: jest.fn(),
  publishReadyStateUpdated: jest.fn(), getReadyStateFromRedis: jest.fn(), lockForProcessing: jest.fn(),
  getProcessingTurnFromRedis: jest.fn(), setProcessingTurnInRedis: jest.fn(), processingLockTTL: 60,
  RedisLockError: class RedisLockError extends Error {},
}));
jest.mock('./game-actions', () => ({ runGameActions: jest.fn() }));
jest.mock('./apply-inventory', () => ({ applyPlayerInventory: jest.fn() }));
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
    expect.objectContaining({ monsters: params.monsters, npcs: [] }), params.messages, [1]);
});

it('preserves the original processing error even if recovery also fails', async () => {
  const error = new Error('action failed');
  jest.mocked(runGameActions).mockRejectedValue(error);
  jest.mocked(redis.setReadyStateInRedis).mockRejectedValue(new Error('recovery failed'));
  await expect(processGameTurn(createParams())).rejects.toBe(error);
  expect(redis.publishGameProcessingFailed).toHaveBeenCalledWith('board', 'map');
  expect(redis.commitGameTurnInRedis).not.toHaveBeenCalled();
});

it.each([2, 3])('runs between-turn work once per turn and always rechecks readiness (last %i)', async turn => {
  jest.mocked(redis.getProcessingTurnFromRedis).mockResolvedValue({ turn });
  await runGameActionsBetweenTurns('board', 'map');
  expect(executeProcessesBetweenTurns).toHaveBeenCalledTimes(turn === 3 ? 0 : 1);
  expect(redis.setProcessingTurnInRedis).toHaveBeenCalledTimes(turn === 3 ? 0 : 1);
  expect(redis.getReadyStateFromRedis).toHaveBeenCalledTimes(1);
  expect(releaseProcessing).toHaveBeenCalledTimes(2);
});
