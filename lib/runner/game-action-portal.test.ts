/** @jest-environment node */
import { actionFastTravel, actionPortal, updatePortalAndShopLeds } from './game-action-portal';
import { PlayerActionType } from '../store/types';
import { createParams } from './test-support/fixtures';

jest.mock('../games/games', () => ({ games: [{ id: 'test-game', locations: Array.from({ length: 7 }, (_, i) => ({
  id: i + 1, description: 'Road', move: i < 6 ? [{ id: i + 2, direction: 'e' }] : [],
})) }] }));
afterEach(() => jest.restoreAllMocks());

it('teleports to a portal and records both ends without duplicating discoveries', () => {
  const params = createParams();
  params.gameState.portals = [1, 3];
  params.gameState.visitedPortals = [1];
  const player = params.gameState.players[0];
  player.retreatDirection = 'w';
  actionPortal(params, player, { id: 1, type: PlayerActionType.Portal, targetLocation: 3, description: '' });
  expect(player.location.id).toBe(3);
  expect(player.retreatDirection).toBeUndefined();
  expect(params.gameState.visited).toEqual([1, 3]);
  expect(params.gameState.visitedPortals).toEqual([1, 3]);
  expect(params.gameState.leds).toEqual(expect.arrayContaining([
    { location: 1, owner: 'portal', rgb: '007F7F' }, { location: 3, owner: 'portal', rgb: '007F7F' },
  ]));
});

it.each([2, 99])('rejects a non-portal or nonexistent destination %i', targetLocation => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const params = createParams();
  const player = params.gameState.players[0];
  actionPortal(params, player, { id: 1, type: PlayerActionType.Portal, targetLocation, description: '' });
  expect(player.location.id).toBe(1);
  expect(params.gameState.visitedPortals).toEqual([]);
});

it.each([
  [6, 'portal', true], [6, 'shop', true], [6, 'monster', false], [7, 'portal', false],
] as const)('validates fast travel distance and hazards (%i, %s)', (targetLocation, owner, allowed) => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const params = createParams();
  params.gameState.visited = [1, 2, 3, 4, 5, 6, 7];
  params.gameState.leds = [{ location: 2, rgb: '', owner }];
  const player = params.gameState.players[0];
  player.location.move = [{ id: 2, direction: 'e' }];
  actionFastTravel(params, player, { id: 1, type: PlayerActionType.FastTravel, targetLocation, description: '' });
  expect(player.location.id).toBe(allowed ? targetLocation : 1);
});

it('does not fast travel through undiscovered locations', () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const params = createParams();
  params.gameState.visited = [1, 3];
  const player = params.gameState.players[0];
  player.location.move = [{ id: 2, direction: 'e' }];
  actionFastTravel(params, player, { id: 1, type: PlayerActionType.FastTravel, targetLocation: 3, description: '' });
  expect(player.location.id).toBe(1);
});

it('rebuilds discovered portal and shop LEDs while preserving other owners', () => {
  const params = createParams();
  Object.assign(params.gameState, { portals: [1, 2, 3], visitedPortals: [2], stores: [1, 3], leds: [
    { location: 9, owner: 'shop', rgb: '' }, { location: 3, owner: 'lock', rgb: 'red' },
  ] });
  updatePortalAndShopLeds(params.gameState);
  expect(params.gameState.leds).toEqual([
    { location: 3, owner: 'lock', rgb: 'red' },
    { location: 1, owner: 'portal', rgb: '007F7F' }, { location: 2, owner: 'portal', rgb: '007F7F' },
    { location: 1, owner: 'shop', rgb: 'A54F5F' },
  ]);
});
