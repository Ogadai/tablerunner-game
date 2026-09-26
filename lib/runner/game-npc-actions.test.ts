/** @jest-environment node */
import { getCombatActions, getNpcActions } from './game-npc-actions';
import { getPlayerActionsCosts } from '../store/playerStats';
import { PlayerActionType } from '../store/types';
import { ConsumableIds } from '../games/items';
import { SpellIds } from '../games/spells';
import { createMonster, createNpc, createParams } from './test-support/fixtures';
import { getMonsterCombatant } from './monster-combatant';

beforeEach(() => jest.spyOn(Math, 'random').mockReturnValue(0));
afterEach(() => jest.restoreAllMocks());

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

it('uses character targets when planning for a monster', () => {
  const monster = createMonster();
  const params = createParams({ monsters: [monster] });
  const result = getCombatActions(params, getMonsterCombatant(monster));
  expect(result.actions).toEqual([expect.objectContaining({ type: PlayerActionType.Attack, target: 'hero' })]);
});
