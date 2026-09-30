/** @jest-environment node */
import { runGameActions } from './game-actions';
import { getMonsterActionsStateFromRedis } from '../store/redis-access';
import { actionAttack, monsterAttack } from './game-action-attack';
import { actionMove, actionRespawn } from './game-action-move';
import { actionCastSpell, actionReadScroll } from './game-action-spell';
import { actionUseItem } from './game-action-use';
import { getNpcActions } from './game-npc-actions';
import { PlayerActionsState, PlayerActionAttack, PlayerActionCast, PlayerActionMove, PlayerActionReadScroll, PlayerActionType, PlayerActionUseItem } from '../store/types';
import { createMonster, createNpc, createParams, createPlayer } from './test-support/fixtures';

jest.mock('../store/redis-access', () => ({ getMonsterActionsStateFromRedis: jest.fn() }));
jest.mock('./game-action-attack', () => ({ actionAttack: jest.fn(), monsterAttack: jest.fn() }));
jest.mock('./game-action-move', () => ({ actionMove: jest.fn(), actionRespawn: jest.fn() }));
jest.mock('./game-action-spell', () => ({ actionCastSpell: jest.fn(), actionReadScroll: jest.fn() }));
jest.mock('./game-action-use', () => ({ actionUseItem: jest.fn() }));
jest.mock('./game-npc-actions', () => ({ getNpcActions: jest.fn(), getCombatActions: jest.fn(() => ({ actions: [] })) }));
jest.mock('../games/games', () => ({ games: [{ id: 'test-game', locations: [{ id: 1, move: [{ id: 2, direction: 'e' }] }] }] }));

const attack = (id: number): PlayerActionAttack => ({ id, type: PlayerActionType.Attack, target: 'rat', description: '' });
const move: PlayerActionMove = { id: 1, type: PlayerActionType.Move, direction: 'e', description: '' };
let playerActions: Record<string, PlayerActionsState>;
beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
  playerActions = { hero: { actions: [] }, enemy: { actions: [] } };
  jest.mocked(getNpcActions).mockReturnValue({ actions: [] });
});
afterEach(() => jest.restoreAllMocks());

it('does not run monster combat without a player or scripted monster present', async () => {
  const params = createParams({ monsters: [createMonster({ id: 'red', team: 'red', location: 2 }),
    createMonster({ id: 'blue', team: 'blue', location: 2 })] });
  await runGameActions(params, playerActions);
  expect(monsterAttack).not.toHaveBeenCalled();
  expect(getMonsterActionsStateFromRedis).not.toHaveBeenCalled();
});

it('runs combat between opposing teams without a player when a scripted monster is present', async () => {
  const params = createParams({ monsters: [createMonster({ id: 'red', team: 'red', location: 2, scriptedActions: true }),
    createMonster({ id: 'blue', team: 'blue', location: 2 })] });
  const monsterAction: PlayerActionAttack = { ...attack(1), target: 'blue' };
  jest.mocked(getMonsterActionsStateFromRedis).mockResolvedValue({ actions: [monsterAction] });
  await runGameActions(params, playerActions);
  expect(getMonsterActionsStateFromRedis).toHaveBeenCalledWith('board', 'map', 'red');
  expect(jest.mocked(monsterAttack).mock.calls.map(call => [call[1].id, call[2].id]).sort())
    .toEqual([['blue', 'red'], ['red', 'blue']]);
});

it('allows recovery among allied monsters but suppresses it around enemy players', async () => {
  const params = createParams({ monsters: [createMonster({ team: 'good' })] });
  const player = params.gameState.players[0];
  player.health = 10;
  await runGameActions(params, playerActions);
  expect(monsterAttack).not.toHaveBeenCalled();
  expect(player.health).toBe(12);
  params.gameState.players.push(createPlayer({ id: 'enemy', team: 'red' }));
  await runGameActions(params, playerActions);
  expect(player.health).toBe(12);
});

it('trims actions from the end to fit the player budget', async () => {
  const params = createParams();
  playerActions.hero = { actions: [attack(1), attack(2), attack(3)] };
  await runGameActions(params, playerActions);
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
  playerActions.hero = { actions: [move] };
  jest.mocked(actionMove).mockImplementation((_params, target) => { target.location = { id: 2, description: 'Road', move: [] }; });
  await runGameActions(params, playerActions);
  expect(player).toMatchObject({ health: 20, magic: 2 });
  expect(npc).toMatchObject({ health: 12, magic: 10, location: { id: 2 } });
  expect(npc.location).not.toBe(player.location);
  expect(getNpcActions).not.toHaveBeenCalled();
});

it('completes combat before movement and suppresses passive healing during combat', async () => {
  const params = createParams({ monsters: [createMonster()] });
  const player = params.gameState.players[0];
  player.health = 10;
  playerActions.hero = { actions: [move] };
  await runGameActions(params, playerActions);
  expect(monsterAttack).toHaveBeenCalled();
  expect(actionMove).toHaveBeenCalled();
  expect(jest.mocked(monsterAttack).mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(actionMove).mock.invocationCallOrder[0]);
  expect(player.health).toBe(10);
});

it('skips queued movement if combat kills the player and advances respawn countdown', async () => {
  const params = createParams({ monsters: [createMonster()] });
  const player = params.gameState.players[0];
  playerActions.hero = { actions: [move] };
  jest.mocked(monsterAttack).mockImplementation(() => { player.health = 0; player.respawnTurns = 3; });
  await runGameActions(params, playerActions);
  expect(actionMove).not.toHaveBeenCalled();
  expect(player.respawnTurns).toBe(2);
});

it('dispatches item, spell, and scroll actions', async () => {
  const params = createParams();
  // A missing item costs zero; Spirit Arrow costs 7, and learning costs 10.
  playerActions.hero = { actions: [
    { id: 1, type: PlayerActionType.UseItem, description: '', itemId: 'missing' },
    { id: 2, type: PlayerActionType.Cast, description: '', spellId: 'spiritArrow' },
    { id: 3, type: PlayerActionType.ReadScroll, description: '', itemId: 'scroll' },
  ] as (PlayerActionUseItem | PlayerActionCast | PlayerActionReadScroll)[] };
  await runGameActions(params, playerActions);
  expect(actionUseItem).toHaveBeenCalledTimes(1);
  expect(actionCastSpell).toHaveBeenCalledTimes(1);
  expect(actionReadScroll).toHaveBeenCalledTimes(1);
});

it('processes respawn actions for dead players', async () => {
  const params = createParams();
  params.gameState.players[0].health = 0;
  playerActions.hero = { actions: [{ id: 1, type: PlayerActionType.Respawn, description: '' }] };
  await runGameActions(params, playerActions);
  expect(actionRespawn).toHaveBeenCalledWith(params, params.gameState.players[0]);
});

it.each([false, true])('moves a scripted monster in an empty location unless blocked (%s)', async blocked => {
  const monster = createMonster({ scriptedActions: true });
  const params = createParams({ monsters: [monster] });
  params.gameState.players = [];
  if (blocked) params.blockedMoves = [{ location: 1, direction: 'e', description: 'Locked' }];
  jest.mocked(getMonsterActionsStateFromRedis).mockResolvedValue({ actions: [move] });
  await runGameActions(params, playerActions);
  expect(monster.location).toBe(blocked ? 1 : 2);
});
