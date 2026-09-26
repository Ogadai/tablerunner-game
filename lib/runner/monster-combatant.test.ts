/** @jest-environment node */
import { getMonsterCombatant } from './monster-combatant';
import { monsters } from '../games/monsters';
import { SpellIds } from '../games/spells';
import { createMonster } from './test-support/fixtures';

it('exposes a live view and writes combat mutations back to the persisted monster', () => {
  const monster = createMonster();
  const view = getMonsterCombatant(monster);
  view.health = 2;
  view.magic = 0;
  view.zombie = true;
  view.equipment = [{ id: 'potion', type: 'healingPotion' }];
  view.effects = [{ description: 'Quick', turns: 2, speed: 3 }];
  view.recentSpells = [SpellIds.heal];
  expect(monster).toMatchObject({ health: 2, magic: 0, zombie: true, equipment: view.equipment, effects: view.effects, recentSpells: [SpellIds.heal] });
  monster.location = 4;
  monster.health = 3;
  expect(view.location.id).toBe(4);
  expect(view.health).toBe(3);
  expect(view.baseStats?.speed).toBe(monsters.rat.baseStats.speed + 3);
});

it('uses definition defaults but preserves explicit empty spells and zero magic', () => {
  const monster = createMonster({ type: 'lich' });
  const view = getMonsterCombatant(monster);
  expect(view.spells).toEqual(monsters.lich.spells);
  expect(view.magic).toBe(monsters.lich.baseStats.magic);
  expect(view.equipment).toEqual([]);
  expect(view.equipped).toEqual({});
  monster.spells = [];
  monster.magic = 0;
  expect(view.spells).toEqual([]);
  expect(view.magic).toBe(0);
});
