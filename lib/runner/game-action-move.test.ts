/** @jest-environment node */
import { actionMove, actionRespawn, updateLockLeds } from './game-action-move';
import { PlayerActionType } from '../store/types';
import { createParams } from './test-support/fixtures';

jest.mock('../games/games', () => ({ games: [{ id: 'test-game', startLocation: 1, locations: [
  { id: 1, description: 'Start', move: [{ id: 2, direction: 'e' }] },
  { id: 2, description: 'Hall', move: [{ id: 3, direction: 'n' }] },
] }] }));

it('moves, records the reverse retreat direction, and discovers locks', () => {
  const params = createParams({ blockedMoves: [{ location: 2, direction: 'n', description: 'Locked' }] });
  params.gameState.visited = [1, 2];
  const player = params.gameState.players[0];
  actionMove(params, player, { id: 1, type: PlayerActionType.Move, direction: 'e', description: '' });
  expect(player.location).toMatchObject({ id: 2, move: [{ id: 3, blockDescription: 'Locked' }] });
  expect(player.retreatDirection).toBe('w');
  expect(params.gameState.visited).toEqual([1, 2]);
  expect(params.gameState.leds).toContainEqual({ location: 3, rgb: 'AD0000', owner: 'lock' });
});

it.each(['e', 'w'] as const)('ignores blocked or unavailable movement %s', direction => {
  const params = createParams({ blockedMoves: [{ location: 1, direction: 'e', description: 'Locked' }] });
  const player = params.gameState.players[0];
  const before = structuredClone(player);
  actionMove(params, player, { id: 1, type: PlayerActionType.Move, direction, description: '' });
  expect(player).toEqual(before);
  expect(params.gameState.visited).toEqual([1]);
});

it('respawns at the start with one health and no retreat direction', () => {
  const params = createParams();
  const player = params.gameState.players[0];
  player.location.id = 2;
  player.health = 0;
  player.retreatDirection = 's';
  actionRespawn(params, player);
  expect(player.location.id).toBe(1);
  expect(player.health).toBe(1);
  expect(player.retreatDirection).toBeUndefined();
});

it('updates only requested lock LEDs and does not duplicate them', () => {
  const params = createParams();
  const other = { location: 2, owner: 'portal', rgb: '123456' };
  params.gameState.leds = [other];
  updateLockLeds(params.gameState, [2, 3], true);
  updateLockLeds(params.gameState, [2], true);
  expect(params.gameState.leds).toHaveLength(3);
  updateLockLeds(params.gameState, [2], false);
  expect(params.gameState.leds).toEqual([other, { location: 3, owner: 'lock', rgb: 'AD0000' }]);
});
