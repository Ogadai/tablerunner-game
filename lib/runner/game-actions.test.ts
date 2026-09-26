/** @jest-environment node */
import { runGameActions } from './game-actions';
import { getActionsStateFromRedis, getMonsterActionsStateFromRedis } from '../store/redis-access';
import { actionAttack, monsterAttack } from './game-action-attack';
import { actionMove, actionRespawn } from './game-action-move';
import { actionCastSpell, actionReadScroll } from './game-action-spell';
import { actionUseItem } from './game-action-use';
import { getNpcActions } from './game-npc-actions';
import { PlayerActionAttack, PlayerActionCast, PlayerActionMove, PlayerActionReadScroll, PlayerActionType, PlayerActionUseItem } from '../store/types';
import { createMonster, createNpc, createParams } from './test-support/fixtures';

jest.mock('../store/redis-access', () => ({ getActionsStateFromRedis: jest.fn(), getMonsterActionsStateFromRedis: jest.fn() }));
jest.mock('./game-action-attack', () => ({ actionAttack: jest.fn(), monsterAttack: jest.fn() }));
jest.mock('./game-action-move', () => ({ actionMove: jest.fn(), actionRespawn: jest.fn() }));
jest.mock('./game-action-spell', () => ({ actionCastSpell: jest.fn(), actionReadScroll: jest.fn() }));
jest.mock('./game-action-use', () => ({ actionUseItem: jest.fn() }));
jest.mock('./game-npc-actions', () => ({ getNpcActions: jest.fn(), getCombatActions: jest.fn(() => ({ actions: [] })) }));
jest.mock('../games/games', () => ({ games: [{ id: 'test-game', locations: [{ id: 1, move: [{ id: 2, direction: 'e' }] }] }] }));

const attack = (id: number): PlayerActionAttack => ({ id, type: PlayerActionType.Attack, target: 'rat', description: '' });
const move: PlayerActionMove = { id: 1, type: PlayerActionType.Move, direction: 'e', description: '' };
beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
  jest.mocked(getActionsStateFromRedis).mockResolvedValue({ actions: [] });
  jest.mocked(getNpcActions).mockReturnValue({ actions: [] });
});
afterEach(() => jest.restoreAllMocks());

it('trims actions from the end to fit the player budget', async () => {
  const params = createParams();
  jest.mocked(getActionsStateFromRedis).mockResolvedValue({ actions: [attack(1), attack(2), attack(3)] });
  await runGameActions(params);
  expect(actionAttack).toHaveBeenCalledTimes(2);
  expect(jest.mocked(actionAttack).mock.calls.map(call => call[2].id)).toEqual([1, 2]);
});

it('recovers health and mana outside combat and moves followers after their master', async () => {
  const params = createParams();
  const player = params.gameState.players[0];
  player.health = 19;
  player.magic = 0;
  const npc = createNpc({ masterId: player.id, health: 10, magic: 9 });
  params.gameState.npcs = [npc];
  jest.mocked(getActionsStateFromRedis).mockResolvedValue({ actions: [move] });
  jest.mocked(actionMove).mockImplementation((_params, target) => { target.location = { id: 2, description: 'Road', move: [] }; });
  await runGameActions(params);
  expect(player).toMatchObject({ health: 20, magic: 2 });
  expect(npc).toMatchObject({ health: 12, magic: 10, location: { id: 2 } });
  expect(npc.location).not.toBe(player.location);
  expect(getNpcActions).not.toHaveBeenCalled();
});

it('completes combat before movement and suppresses passive healing during combat', async () => {
  const params = createParams({ monsters: [createMonster()] });
  const player = params.gameState.players[0];
  player.health = 10;
  jest.mocked(getActionsStateFromRedis).mockResolvedValue({ actions: [move] });
  await runGameActions(params);
  expect(monsterAttack).toHaveBeenCalled();
  expect(actionMove).toHaveBeenCalled();
  expect(jest.mocked(monsterAttack).mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(actionMove).mock.invocationCallOrder[0]);
  expect(player.health).toBe(10);
});

it('skips queued movement if combat kills the player and advances respawn countdown', async () => {
  const params = createParams({ monsters: [createMonster()] });
  const player = params.gameState.players[0];
  jest.mocked(getActionsStateFromRedis).mockResolvedValue({ actions: [move] });
  jest.mocked(monsterAttack).mockImplementation(() => { player.health = 0; player.respawnTurns = 6; });
  await runGameActions(params);
  expect(actionMove).not.toHaveBeenCalled();
  expect(player.respawnTurns).toBe(5);
});

it('dispatches item, spell, and scroll actions', async () => {
  const params = createParams();
  // A missing item costs zero; Spirit Arrow costs 7, and learning costs 10.
  jest.mocked(getActionsStateFromRedis).mockResolvedValue({ actions: [
    { id: 1, type: PlayerActionType.UseItem, description: '', itemId: 'missing' },
    { id: 2, type: PlayerActionType.Cast, description: '', spellId: 'spiritArrow' },
    { id: 3, type: PlayerActionType.ReadScroll, description: '', itemId: 'scroll' },
  ] as (PlayerActionUseItem | PlayerActionCast | PlayerActionReadScroll)[] });
  await runGameActions(params);
  expect(actionUseItem).toHaveBeenCalledTimes(1);
  expect(actionCastSpell).toHaveBeenCalledTimes(1);
  expect(actionReadScroll).toHaveBeenCalledTimes(1);
});

it('processes respawn actions for dead players', async () => {
  const params = createParams();
  params.gameState.players[0].health = 0;
  jest.mocked(getActionsStateFromRedis).mockResolvedValue({ actions: [{ id: 1, type: PlayerActionType.Respawn, description: '' }] });
  await runGameActions(params);
  expect(actionRespawn).toHaveBeenCalledWith(params, params.gameState.players[0]);
});

it.each([false, true])('moves a scripted monster in an empty location unless blocked (%s)', async blocked => {
  const monster = createMonster({ scriptedActions: true });
  const params = createParams({ monsters: [monster] });
  params.gameState.players = [];
  if (blocked) params.blockedMoves = [{ location: 1, direction: 'e', description: 'Locked' }];
  jest.mocked(getMonsterActionsStateFromRedis).mockResolvedValue({ actions: [move] });
  await runGameActions(params);
  expect(monster.location).toBe(blocked ? 1 : 2);
});
