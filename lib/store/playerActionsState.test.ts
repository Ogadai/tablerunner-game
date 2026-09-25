import { addPlayerAction, getPlayerActionsState, removePlayerAction } from './playerActionsState';
import { getActionsStateFromRedis, setActionsStateInRedis } from './redis-access';
import { PlayerActionType, type PlayerAction } from './types';

jest.mock('./redis-access', () => ({ getActionsStateFromRedis: jest.fn(), setActionsStateInRedis: jest.fn() }));
const read = jest.mocked(getActionsStateFromRedis);
const write = jest.mocked(setActionsStateInRedis);
const move: PlayerAction = { id: 1, type: PlayerActionType.Move, description: 'Move' };
const attack: PlayerAction = { id: 2, type: PlayerActionType.Attack, description: 'Attack' };

beforeEach(() => { jest.resetAllMocks(); read.mockResolvedValue({ actions: [move, attack] }); });

it('reads actions for the requested player', async () => {
  await expect(getPlayerActionsState('board', 'map', 'hero')).resolves.toEqual({ success: true, data: { actions: [move, attack] } });
  expect(read).toHaveBeenCalledWith('board', 'map', 'hero');
});

it('replaces existing movement while preserving other actions and the original state', async () => {
  const actions = [move, attack, { ...move, id: 3 }];
  read.mockResolvedValue({ actions });
  const replacement = { ...move, id: 4 };
  const result = await addPlayerAction('board', 'map', 'hero', replacement);
  expect(result).toEqual({ success: true, data: { actions: [attack, replacement] } });
  expect(write).toHaveBeenCalledWith('board', 'map', 'hero', result.data);
  expect(actions).toHaveLength(3);
  expect(result.data!.actions[1]).not.toBe(replacement);
});

it('appends non-movement actions without removing an existing action of the same type', async () => {
  const next = { ...attack, id: 3 };
  await expect(addPlayerAction('board', 'map', 'hero', next)).resolves.toEqual({ success: true, data: { actions: [move, attack, next] } });
});

it.each([1, 99])('removes only the requested action ID %i', async id => {
  const actions = id === 1 ? [attack] : [move, attack];
  await expect(removePlayerAction('board', 'map', 'hero', id)).resolves.toEqual({ success: true, data: { actions } });
  expect(write).toHaveBeenCalledWith('board', 'map', 'hero', { actions });
});

it.each([
  () => getPlayerActionsState('board', 'map', 'hero'),
  () => addPlayerAction('board', 'map', 'hero', move),
  () => removePlayerAction('board', 'map', 'hero', 1),
])('reports read failures without writing', async action => {
  read.mockRejectedValue(new Error('Read failed'));
  await expect(action()).resolves.toEqual({ success: false, error: 'Read failed' });
  expect(write).not.toHaveBeenCalled();
});

it.each([
  () => addPlayerAction('board', 'map', 'hero', move),
  () => removePlayerAction('board', 'map', 'hero', 1),
])('reports write failures', async action => {
  write.mockRejectedValue(new Error('Write failed'));
  await expect(action()).resolves.toEqual({ success: false, error: 'Write failed' });
});
