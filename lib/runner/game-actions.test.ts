/** @jest-environment node */
import { runGameActions } from './game-actions';
import { getMonsterActionsForTurnFromRedis } from '../store/redis-access';
import { actionAttack, monsterAttack } from './game-action-attack';
import { actionMove, actionRespawn } from './game-action-move';
import { actionFastTravel, actionPortal } from './game-action-portal';
import { actionCastSpell, actionReadScroll } from './game-action-spell';
import { actionUseItem } from './game-action-use';
import { getNpcActions } from './game-npc-actions';
import { SpellIds } from '../games/spells';
import { PlayerActionsState, PlayerActionAttack, PlayerActionCast, PlayerActionMove, PlayerActionReadScroll, PlayerActionType, PlayerActionUseItem } from '../store/types';
import { createMonster, createNpc, createParams, createPlayer } from './test-support/fixtures';
import { gameRunners } from './games';
import { ScrollIds } from '../games/items';
import { getNpcSpells } from './shared-processes/npcs';

jest.mock('../store/redis-access', () => ({ getMonsterActionsForTurnFromRedis: jest.fn() }));
jest.mock('./game-action-attack', () => ({ actionAttack: jest.fn(), monsterAttack: jest.fn() }));
jest.mock('./game-action-move', () => ({ actionMove: jest.fn(), actionRespawn: jest.fn() }));
jest.mock('./game-action-portal', () => ({ actionFastTravel: jest.fn(), actionPortal: jest.fn() }));
jest.mock('./game-action-spell', () => ({ actionCastSpell: jest.fn(), actionReadScroll: jest.fn() }));
jest.mock('./game-action-use', () => ({ actionUseItem: jest.fn() }));
jest.mock('./game-npc-actions', () => ({ getNpcActions: jest.fn() }));
jest.mock('./games', () => ({ gameRunners: { 'test-game': { executeNpcAction: jest.fn() } } }));
jest.mock('../games/games', () => ({ games: [{ id: 'test-game', locations: [{ id: 1, move: [{ id: 2, direction: 'e' }] }] }] }));

const attack = (id: number): PlayerActionAttack => ({ id, type: PlayerActionType.Attack, target: 'rat', description: '' });
const move: PlayerActionMove = { id: 1, type: PlayerActionType.Move, direction: 'e', description: '' };
const executeNpcAction = jest.mocked(gameRunners['test-game'].executeNpcAction!);
let playerActions: Record<string, PlayerActionsState>;
function mockQueuedActions(queued: PlayerActionsState | null) {
  jest.mocked(getMonsterActionsForTurnFromRedis).mockImplementation(async (_boardId, _mapId, ids) =>
    Object.fromEntries(ids.map(id => [id, queued ? { actions: queued.actions.map(action => ({ ...action })) } : null])));
}
beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
  playerActions = { hero: { actions: [] }, enemy: { actions: [] } };
  jest.mocked(getNpcActions).mockReturnValue({ actions: [] });
  mockQueuedActions(null);
});
afterEach(() => jest.restoreAllMocks());

it.each([null, { actions: [] }])('runs an NPC combat fallback without a player, replacing stale idle orders (%s)', async queued => {
  const npc = createNpc({ scriptedActions: true, team: 'red' });
  const params = createParams({ monsters: [createMonster()] });
  params.gameState.players = [];
  params.gameState.npcs = [npc];
  mockQueuedActions(queued);
  jest.mocked(getNpcActions).mockReturnValue({ actions: [attack(1)] });
  await runGameActions(params, {});
  expect(getNpcActions).toHaveBeenCalledWith(params, npc);
  expect(actionAttack).toHaveBeenCalledWith(params, npc, attack(1));
});

it('lets an NPC retreat after opponents finish their combat actions', async () => {
  const npc = createNpc({ scriptedActions: true, retreatDirection: 'e', team: 'npc' });
  const params = createParams({ monsters: [createMonster()] });
  params.gameState.players = [];
  params.gameState.npcs = [npc];
  mockQueuedActions({ actions: [move] });
  await runGameActions(params, {});
  expect(executeNpcAction).toHaveBeenCalledWith(params, npc, move);
  expect(getNpcActions).not.toHaveBeenCalled();
  expect(executeNpcAction.mock.invocationCallOrder[0])
    .toBeGreaterThan(jest.mocked(monsterAttack).mock.invocationCallOrder[0]);
});

it('moves a scripted NPC and its living party together after combat', async () => {
  const npc = createNpc({ scriptedActions: true, team: 'npc' });
  const ally = createMonster({ team: npc.team, masterId: npc.id, scriptedActions: true });
  const params = createParams({ monsters: [ally] });
  params.gameState.players = [];
  params.gameState.npcs = [npc];
  mockQueuedActions({ actions: [move] });
  executeNpcAction.mockImplementation((_params, target) => { target.location.id = 2; });
  await runGameActions(params, {});
  expect(executeNpcAction).toHaveBeenCalledWith(params, npc, move);
  expect(ally.location).toBe(2);
  expect(monsterAttack).not.toHaveBeenCalled();
  expect(getMonsterActionsForTurnFromRedis).toHaveBeenCalledTimes(1);
  expect(getMonsterActionsForTurnFromRedis).toHaveBeenCalledWith('board', 'map', [npc.id]);
});

it('leaves a defeated NPC for game processes without recovering it or executing its queued travel', async () => {
  jest.mocked(Math.random).mockReturnValue(0);
  const npc = createNpc({ scriptedActions: true, team: 'npc', startLocation: 4, health: 1, retreatDirection: 'e' });
  const ally = createMonster({ id: 'ally', team: npc.team, masterId: npc.id });
  const params = createParams({ monsters: [createMonster(), ally] });
  params.gameState.players = [];
  params.gameState.npcs = [npc];
  mockQueuedActions({ actions: [move] });
  jest.mocked(monsterAttack).mockImplementation((_turn, _monster, target) => {
    target.health = 0;
  });
  await runGameActions(params, {});
  expect(npc).toMatchObject({ health: 0, location: { id: 1 } });
  expect(executeNpcAction).not.toHaveBeenCalled();
  expect(ally).toMatchObject({ location: 1 });
  expect(ally.masterId).toBe(npc.id);
});

it('does not run monster combat without a player or scripted monster present', async () => {
  const params = createParams({ monsters: [createMonster({ id: 'red', team: 'red', location: 2 }),
    createMonster({ id: 'blue', team: 'blue', location: 2 })] });
  await runGameActions(params, playerActions);
  expect(monsterAttack).not.toHaveBeenCalled();
  expect(getMonsterActionsForTurnFromRedis).not.toHaveBeenCalled();
});

it('runs combat between opposing teams without a player when a scripted monster is present', async () => {
  const params = createParams({ monsters: [createMonster({ id: 'red', team: 'red', location: 2, scriptedActions: true }),
    createMonster({ id: 'blue', team: 'blue', location: 2 })] });
  const monsterAction: PlayerActionAttack = { ...attack(1), target: 'blue' };
  mockQueuedActions({ actions: [monsterAction] });
  await runGameActions(params, playerActions);
  expect(getMonsterActionsForTurnFromRedis).toHaveBeenCalledWith('board', 'map', ['red']);
  expect(jest.mocked(monsterAttack).mock.calls.map(call => [call[1].id, call[2].id]).sort())
    .toEqual([['blue', 'red'], ['red', 'blue']]);
});

it('fetches scripted garrison queues together while excluding dead units', async () => {
  const garrison = Array.from({ length: 40 }, (_, index) => createMonster({
    id: `garrison-${index}`, location: 2, team: 'good', scriptedActions: true,
  }));
  const params = createParams({ monsters: [...garrison,
    createMonster({ id: 'dead', health: 0, scriptedActions: true }),
  ] });
  mockQueuedActions({ actions: [] });
  await runGameActions(params, playerActions);
  expect(getMonsterActionsForTurnFromRedis).toHaveBeenCalledTimes(1);
  expect(getMonsterActionsForTurnFromRedis).toHaveBeenCalledWith('board', 'map', garrison.map(monster => monster.id));
  expect(monsterAttack).not.toHaveBeenCalled();
  expect(getNpcActions).not.toHaveBeenCalled();
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
    mockQueuedActions({ actions: [attack(1), move] });
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
    expect(getMonsterActionsForTurnFromRedis).not.toHaveBeenCalled();
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
  mockQueuedActions({ actions: [move] });
  await runGameActions(params, playerActions);
  expect(monster.location).toBe(blocked ? 1 : 2);
});

it.each([PlayerActionType.Move, PlayerActionType.Portal, PlayerActionType.FastTravel] as const)(
  'moves and recovers an NPC caster and its summon with the player (%s)', async type => {
    const mage = createNpc({ id: 'mage', masterId: 'hero', health: 10, magic: 0 });
    const spirit = createNpc({ id: 'spirit', masterId: mage.id, health: 5, magic: 0, turnsLeft: 5 });
    const params = createParams();
    // Follower storage order must not affect movement or recovery.
    params.gameState.npcs = [spirit, mage];
    const travelAction = type === PlayerActionType.Move ? move
      : { id: 1, type, description: '', targetLocation: 2 };
    playerActions.hero = { actions: [travelAction] };
    for (const travel of [actionMove, actionPortal, actionFastTravel]) {
      jest.mocked(travel).mockImplementation((_params, target) => {
        target.location = { id: 2, description: 'Road', move: [] };
      });
    }

    await runGameActions(params, playerActions);

    expect(mage).toMatchObject({ health: 12, magic: 2, location: { id: 2 } });
    expect(spirit).toMatchObject({ health: 7, magic: 2, location: { id: 2 } });
    expect(getNpcActions).not.toHaveBeenCalled();
  },
);

it('moves a summoned NPC with its independent NPC master and skips combat during travel', async () => {
  const mage = createNpc({ id: 'mage', scriptedActions: true, team: 'red' });
  const spirit = createNpc({ id: 'spirit', masterId: mage.id, team: mage.team, turnsLeft: 5 });
  const params = createParams();
  params.gameState.players = [];
  params.gameState.npcs = [spirit, mage];
  mockQueuedActions({ actions: [move] });
  executeNpcAction.mockImplementation((_params, target) => { target.location.id = 2; });

  await runGameActions(params, {});

  expect(spirit.location.id).toBe(2);
  expect(getNpcActions).not.toHaveBeenCalled();
});

it('lets an NPC summon fight and recover mana without passive healing during combat', async () => {
  const mage = createNpc({ id: 'mage', masterId: 'hero' });
  const spirit = createNpc({ id: 'spirit', masterId: mage.id, health: 5, magic: 0, turnsLeft: 5 });
  const params = createParams({ monsters: [createMonster()] });
  params.gameState.npcs = [spirit, mage];
  jest.mocked(getNpcActions).mockReturnValue({ actions: [attack(1)] });

  await runGameActions(params, playerActions);

  expect(actionAttack).toHaveBeenCalledWith(params, spirit, attack(1));
  expect(spirit).toMatchObject({ health: 5, magic: 2 });
});

it('learns Spirit Guide, summons support on the next turn, and keeps it on subsequent turns', async () => {
  const mage = createNpc({ id: 'mage', name: 'Mage', masterId: 'hero', magic: 40,
    spells: [], equipment: [{ id: 'guide-scroll', type: ScrollIds.spiritGuide }],
    equipped: {}, baseStats: { attack: 6, damage: 6, defence: 10, health: 20, magic: 40, speed: 10 } });
  const params = createParams();
  params.gameState.npcs = [mage];
  jest.mocked(getNpcActions).mockImplementation(jest.requireActual('./game-npc-actions').getNpcActions);
  jest.mocked(actionCastSpell).mockImplementation(jest.requireActual('./game-action-spell').actionCastSpell);
  jest.mocked(actionReadScroll).mockImplementation(jest.requireActual('./game-action-spell').actionReadScroll);

  await runGameActions(params, playerActions);
  expect(mage.spells).toContain(SpellIds.spiritGuide);
  expect(mage.equipment).toEqual([]);
  mage.spells.push(...getNpcSpells('mage'));

  await runGameActions(params, playerActions);
  const spirit = params.gameState.npcs.find(npc => npc.masterId === mage.id)!;
  expect(spirit).toMatchObject({ name: 'Spirit Eagle', turnsLeft: 5, team: mage.team });
  expect(params.messages.hero.messages).toContainEqual({ text: '**Mage** summoned **Spirit Eagle**' });

  await runGameActions(params, playerActions);
  expect(params.gameState.npcs.filter(npc => npc.masterId === mage.id)).toEqual([spirit]);
  expect(spirit.turnsLeft).toBe(5);
});
