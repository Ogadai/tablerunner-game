/** @jest-environment node */
import { getNpcActions } from './game-npc-actions';
import { getPlayerActionsCosts } from '../store/playerStats';
import { PlayerActionType } from '../store/types';
import { ConsumableIds, EquipableIds, ScrollIds } from '../games/items';
import { SpellIds } from '../games/spells';
import { createMonster, createNpc, createParams, createPlayer } from './test-support/fixtures';
import { getMonsterCombatant } from './monster-combatant';

beforeEach(() => jest.spyOn(Math, 'random').mockReturnValue(0));
afterEach(() => jest.restoreAllMocks());

it.each(['npc', 'monster'])('plans attacks by team for a %s, including enemy monsters', kind => {
  const actor = kind === 'npc' ? createNpc({ team: 'red' }) : getMonsterCombatant(createMonster({ id: 'actor', team: 'red' }));
  const params = createParams({ monsters: [createMonster({ team: 'red' }), createMonster({ id: 'enemy-monster', team: 'blue' })] });
  params.gameState.players = [createPlayer({ team: 'red' })];
  const actions = getNpcActions(params, actor).actions;
  expect(actions.length).toBeGreaterThan(0);
  expect(actions.every(action => 'target' in action && action.target === 'enemy-monster')).toBe(true);
});

it('returns no actions for dead combatants or when nothing useful can be done', () => {
  const params = createParams();
  expect(getNpcActions(params, createNpc({ health: 0 })).actions).toEqual([]);
  expect(getNpcActions(params, createNpc()).actions).toEqual([]);
});

it('attacks only living local enemies within the action budget', () => {
  const params = createParams({ monsters: [createMonster(), createMonster({ id: 'dead', health: 0 }), createMonster({ id: 'far', location: 2 })] });
  const npc = createNpc();
  const result = getNpcActions(params, npc);
  expect(result.actions.length).toBeGreaterThan(0);
  for (const action of result.actions) {
    expect(action).toMatchObject({ type: PlayerActionType.Attack, target: 'rat' });
  }
  expect(getPlayerActionsCosts(npc, result)).toBeLessThanOrEqual(20);
});

it('prioritizes emergency healing without using the same potion twice', () => {
  const params = createParams({ monsters: [createMonster()] });
  const npc = createNpc({ health: 5, equipment: [{ id: 'heal', type: ConsumableIds.healingPotion }] });
  const result = getNpcActions(params, npc);
  expect(result.actions[0]).toMatchObject({ type: PlayerActionType.UseItem, itemId: 'heal' });
  expect(result.actions.filter(a => a.type === PlayerActionType.UseItem)).toHaveLength(1);
  expect(getPlayerActionsCosts(npc, result)).toBeLessThanOrEqual(20);
  expect(npc.health).toBe(5);
  expect(npc.equipment).toHaveLength(1);
});

it('plans mana restoration before a spell that is currently unaffordable', () => {
  const params = createParams({ monsters: [createMonster()] });
  const npc = createNpc({ magic: 0, spells: [SpellIds.spiritArrow], equipment: [{ id: 'mana', type: ConsumableIds.manaPotion }],
    baseStats: { attack: 0, damage: 0, defence: 10, health: 20, magic: 10, speed: 10 } });
  const result = getNpcActions(params, npc);
  expect(result.actions[0]).toMatchObject({ type: PlayerActionType.UseItem, itemId: 'mana' });
  expect(result.actions[1]).toMatchObject({ type: PlayerActionType.Cast, spellId: SpellIds.spiritArrow, targetId: 'rat' });
  expect(npc.magic).toBe(0);
});

it.each([
  [SpellIds.fear, ['rat', 'other-enemy']],
  [SpellIds.shield, ['hero', 'npc']],
  [SpellIds.strength, ['hero', 'npc']],
] as const)('plans %s only once per target while still allowing different targets', (spellId, targetIds) => {
  const npc = createNpc({
    magic: 60, spells: [spellId], equipment: [],
    baseStats: { attack: 0, damage: 0, defence: 10, health: 20, magic: 60, speed: 10 },
  });
  const params = createParams({ monsters: [createMonster(), createMonster({ id: 'other-enemy' })] });
  params.gameState.npcs = [npc];

  expect(getNpcActions(params, npc).actions).toEqual(targetIds.map(targetId =>
    expect.objectContaining({ type: PlayerActionType.Cast, spellId, targetId })
  ));
});

it.each([SpellIds.terror, SpellIds.shieldWall, SpellIds.strengthAura])('plans %s only once per turn for the whole group', spellId => {
  const npc = createNpc({
    magic: 60, spells: [spellId], equipment: [],
    baseStats: { attack: 0, damage: 0, defence: 10, health: 20, magic: 60, speed: 10 },
  });
  const params = createParams({ monsters: [createMonster(), createMonster({ id: 'other-enemy' })] });
  params.gameState.npcs = [npc];

  expect(getNpcActions(params, npc).actions).toEqual([
    expect.objectContaining({ type: PlayerActionType.Cast, spellId, targetId: undefined }),
  ]);
});

it('allows Fear on the same target again on a subsequent turn', () => {
  const npc = createNpc({
    magic: 60, spells: [SpellIds.fear], equipment: [],
    baseStats: { attack: 0, damage: 0, defence: 10, health: 20, magic: 60, speed: 10 },
  });
  const params = createParams({ monsters: [createMonster()] });
  const expectedActions = [expect.objectContaining({ type: PlayerActionType.Cast, spellId: SpellIds.fear, targetId: 'rat' })];

  expect(getNpcActions(params, npc).actions).toEqual(expectedActions);
  params.gameState.turn++;
  expect(getNpcActions(params, npc).actions).toEqual(expectedActions);
});

it.each([SpellIds.spiritArrow, SpellIds.fireWall, SpellIds.heal, SpellIds.healingAura])('still allows repeated casts of %s in one turn', spellId => {
  const npc = createNpc({
    magic: 100, spells: [spellId], equipment: [],
    baseStats: { attack: 0, damage: 0, defence: 10, health: 20, magic: 100, speed: 10 },
  });
  const params = createParams({ monsters: [createMonster()] });
  params.gameState.players = [createPlayer({ health: 5 })];
  const actions = getNpcActions(params, npc).actions;

  expect(actions.length).toBeGreaterThan(1);
  expect(actions).toEqual(actions.map(() => expect.objectContaining({ type: PlayerActionType.Cast, spellId })));
});

it('offers an eligible scroll and preserves its inventory item ID', () => {
  const npc = createNpc({
    equipment: [{ id: 'spell-scroll', type: ScrollIds.spiritArrow }],
  });

  expect(getNpcActions(createParams(), npc).actions).toContainEqual(
    expect.objectContaining({ type: PlayerActionType.ReadScroll, itemId: 'spell-scroll' })
  );
});

it.each([
  ['a spell the NPC already knows', { spells: [SpellIds.spiritArrow] }, 10],
  ['a spell above the NPC magic level', { spells: [] }, 9],
])('does not offer a scroll for %s', (_reason, overrides, magic) => {
  const npc = createNpc({
    ...overrides,
    baseStats: { attack: 6, damage: 6, defence: 10, health: 20, magic, speed: 10 },
    equipment: [{ id: 'spell-scroll', type: ScrollIds.spiritArrow }],
  });

  expect(getNpcActions(createParams(), npc).actions).toEqual([]);
});

it('uses effect-enhanced attack stats when planning NPC attacks', () => {
  const params = createParams({ monsters: [createMonster()] });
  const npc = createNpc({
    baseStats: { attack: 0, damage: 10, defence: 10, health: 20, magic: 0, speed: 10 },
    effects: [{ description: 'Blessed', turns: 2, attack: 2 }],
  });

  expect(getNpcActions(params, npc).actions).toContainEqual(
    expect.objectContaining({ type: PlayerActionType.Attack, target: 'rat' })
  );
});

it('uses equipment-enhanced magic when planning NPC spells', () => {
  const params = createParams({ monsters: [createMonster()] });
  const npc = createNpc({
    magic: 3,
    baseStats: { attack: 0, damage: 0, defence: 10, health: 20, magic: 0, speed: 10 },
    spells: [SpellIds.spiritArrow],
    equipment: [{ id: 'staff', type: EquipableIds.staffSun }],
    equipped: { weapon: 'staff' },
  });

  expect(getNpcActions(params, npc).actions).toContainEqual(
    expect.objectContaining({ type: PlayerActionType.Cast, spellId: SpellIds.spiritArrow })
  );
});

it('uses character targets when planning for a monster', () => {
  const monster = createMonster();
  const params = createParams({ monsters: [monster] });
  const result = getNpcActions(params, getMonsterCombatant(monster));
  expect(result.actions).toEqual([expect.objectContaining({ type: PlayerActionType.Attack, target: 'hero' })]);
});
