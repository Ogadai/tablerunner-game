import { getMonsterActionsState, setMonsterActionsState } from './monsterActionsState';
import { getMonsterActionsStateFromRedis, setMonsterActionsStateInRedis } from './redis-access';
import { PlayerActionType } from './types';

jest.mock('./redis-access', () => ({ getMonsterActionsStateFromRedis: jest.fn(), setMonsterActionsStateInRedis: jest.fn() }));
const state = { actions: [{ id: 1, type: PlayerActionType.Attack, description: 'Attack' }] };
beforeEach(() => jest.resetAllMocks());

it.each([null, state])('returns stored actions or an empty queue for a missing monster', async stored => {
  jest.mocked(getMonsterActionsStateFromRedis).mockResolvedValue(stored);
  await expect(getMonsterActionsState('board', 'map', 'boss')).resolves.toEqual({ success: true, data: stored ?? { actions: [] } });
  expect(getMonsterActionsStateFromRedis).toHaveBeenCalledWith('board', 'map', 'boss');
});

it('persists and returns the replacement queue', async () => {
  await expect(setMonsterActionsState('board', 'map', 'boss', state)).resolves.toEqual({ success: true, data: state });
  expect(setMonsterActionsStateInRedis).toHaveBeenCalledWith('board', 'map', 'boss', state);
});

it('reports read and write errors', async () => {
  jest.mocked(getMonsterActionsStateFromRedis).mockRejectedValue(new Error('Read failed'));
  jest.mocked(setMonsterActionsStateInRedis).mockRejectedValue(new Error('Write failed'));
  await expect(getMonsterActionsState('board', 'map', 'boss')).resolves.toEqual({ success: false, error: 'Read failed' });
  await expect(setMonsterActionsState('board', 'map', 'boss', state)).resolves.toEqual({ success: false, error: 'Write failed' });
});
