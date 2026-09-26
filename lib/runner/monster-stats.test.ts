/** @jest-environment node */
import { getMonsterStats } from './monster-stats';
import { monsters } from '../games/monsters';
import { allItems, EquipableIds } from '../games/items';
import { createMonster } from './test-support/fixtures';

it('combines equipped items and effects without modifying the monster definition', () => {
  const base = { ...monsters.rat.baseStats };
  const monster = createMonster({ equipment: [{ id: 'weapon', type: EquipableIds.swordRusty }],
    equipped: { weapon: 'weapon' }, effects: [{ description: 'Weak', turns: 2, attack: -2 }] });
  const stats = getMonsterStats(monster);
  expect(stats.attack).toBe(base.attack + (allItems[EquipableIds.swordRusty].bonusStats?.attack ?? 0) - 2);
  expect(monsters.rat.baseStats).toEqual(base);
  expect(getMonsterStats(createMonster())).toMatchObject(base);
});
