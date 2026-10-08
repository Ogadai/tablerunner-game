/** @jest-environment node */
import { runGameActions } from './game-actions';
import { getMonsterActionsStateFromRedis } from '../store/redis-access';
import { actionAttack, monsterAttack } from './game-action-attack';
import { actionMove, actionRespawn } from './game-action-move';
import { actionFastTravel, actionPortal } from './game-action-portal';
import { actionCastSpell, actionReadScroll } from './game-action-spell';
import { actionUseItem } from './game-action-use';
import { getNpcActions } from './game-npc-actions';
import { SpellIds } from '../games/spells';
import { PlayerActionsState, PlayerActionAttack, PlayerActionCast, PlayerActionMove, PlayerActionReadScroll, PlayerActionType, PlayerActionUseItem } from '../store/types';
import { createMonster, createNpc, createParams, createPlayer } from './test-support/fixtures';

jest.mock('../store/redis-access', () => ({ getMonsterActionsStateFromRedis: jest.fn() }));
jest.mock('./game-action-attack', () => ({ actionAttack: jest.fn(), monsterAttack: jest.fn() }));
jest.mock('./game-action-move', () => ({ actionMove: jest.fn(), actionRespawn: jest.fn() }));
jest.mock('./game-action-portal', () => ({ actionFastTravel: jest.fn(), actionPortal: jest.fn() }));
jest.mock('./game-action-spell', () => ({ actionCastSpell: jest.fn(), actionReadScroll: jest.fn() }));
jest.mock('./game-action-use', () => ({ actionUseItem: jest.fn() }));
jest.mock('./game-npc-actions', () => ({ getNpcActions: jest.fn() }));
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

it('recovers followers using equipment-enhanced health and magic, capped at their maximums', async () => {
  const params = createParams();
  const npc = createNpc({
    masterId: params.gameState.players[0].id,
    health: 20,
    magic: 10,
    equipment: [{ id: 'staff', type: 'staffEarth' }],
    equipped: { weapon: 'staff' },
  });
  params.gameState.npcs = [npc];
  await runGameActions(params, playerActions);
  expect(npc).toMatchObject({ health: 23, magic: 14 });
  npc.health = 29;
  npc.magic = 19;
  await runGameActions(params, playerActions);
  expect(npc).toMatchObject({ health: 30, magic: 20 });
  expect(npc.baseStats).toMatchObject({ health: 20, magic: 10 });
});

it.each([PlayerActionType.Move, PlayerActionType.Portal, PlayerActionType.FastTravel, PlayerActionType.Respawn])(
  'suppresses all monster follower actions and follows a player using %s', async type => {
    const followers = [
      createMonster({ id: 'fighter', masterId: 'hero' }),
      createMonster({ id: 'caster', masterId: 'hero', spells: [SpellIds.spiritArrow] }),
      createMonster({ id: 'scripted', masterId: 'hero', scriptedActions: true }),
    ];
    const params = createParams({ monsters: followers });
    const player = params.gameState.players[0];
    if (type === PlayerActionType.Respawn) player.health = 0;
    const travelAction = type === PlayerActionType.Move ? move
      : { id: 1, type, description: '', targetLocation: 2 };
    playerActions.hero = { actions: [travelAction] };
    for (const travel of [actionMove, actionPortal, actionFastTravel, actionRespawn]) {
      jest.mocked(travel).mockImplementation((_params, target) => {
        target.location = { id: 2, description: 'Road', move: [] };
        target.health = 20;
      });
    }
    jest.mocked(getMonsterActionsStateFromRedis).mockResolvedValue({ actions: [attack(1), move] });
    jest.mocked(getNpcActions).mockReturnValue({ actions: [
      { id: 1, type: PlayerActionType.Cast, description: '', spellId: 'spiritArrow' } as PlayerActionCast,
      { id: 2, type: PlayerActionType.UseItem, description: '', itemId: 'potion' } as PlayerActionUseItem,
    ] });

    await runGameActions(params, playerActions);

    expect(followers.map(monster => monster.location)).toEqual([2, 2, 2]);
    expect(monsterAttack).not.toHaveBeenCalled();
    expect(actionCastSpell).not.toHaveBeenCalled();
    expect(actionUseItem).not.toHaveBeenCalled();
    expect(getNpcActions).not.toHaveBeenCalled();
    expect(getMonsterActionsStateFromRedis).not.toHaveBeenCalled();
  },
);

it('keeps monster followers with their master when travel fails, leaving dead followers in place', async () => {
  const follower = createMonster({ masterId: 'hero' });
  const deadFollower = createMonster({ id: 'dead', masterId: 'hero', health: 0, location: 2 });
  const params = createParams({ monsters: [follower, deadFollower] });
  playerActions.hero = { actions: [move] };

  await runGameActions(params, playerActions);

  expect(follower.location).toBe(params.gameState.players[0].location.id);
  expect(deadFollower.location).toBe(2);
  expect(monsterAttack).not.toHaveBeenCalled();
});

it.each([undefined, 'hero', 'missing'])('allows monster actions with a stationary or absent player master (%s)', async masterId => {
  const follower = createMonster({ masterId });
  const params = createParams({ monsters: [follower] });

  await runGameActions(params, playerActions);

  expect(monsterAttack).toHaveBeenCalledWith(params, follower, params.gameState.players[0]);
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
