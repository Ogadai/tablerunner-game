import { equipBestNpcItems } from './npcInventory';
import { createNpc } from './test-support/fixtures';
import { NOTHING_EQUPPED, NPCState, PlayerInventoryState } from './types';

function makeInventory(...types: string[]): PlayerInventoryState {
  return { equipment: types.map((type, index) => ({ id: `${type}-${index}`, type })), equipped: null };
}

it.each([
  ['ranger', 'bowLong'],
  ['barbarian', 'swordSteel'],
  ['witch', 'staffOrb'],
  ['mage', 'staffOrb'],
] as const)('prefers %s weapons over more expensive alternatives', (characterType, expected) => {
  // Every preferred weapon costs less than at least one unsuitable alternative.
  const inventory = makeInventory('staffOrb', 'bowLong', 'swordSteel');
  if (characterType === 'ranger' || characterType === 'witch' || characterType === 'mage') {
    inventory.equipment!.push({ id: 'expensive', type: 'swordDragon' });
  }
  equipBestNpcItems(createNpc({ characterType }), inventory);
  expect(inventory.equipped?.weapon).toBe(inventory.equipment!.find(item => item.type === expected)!.id);
});

it.each([false, true])('chooses the most valuable preferred weapon regardless of order (reversed=%s)', reverse => {
  const inventory = makeInventory('bowWarped', 'swordDragon', 'crossbow', 'bowLong');
  if (reverse) inventory.equipment!.reverse();
  equipBestNpcItems(createNpc({ characterType: 'ranger' }), inventory);
  expect(inventory.equipped?.weapon).toBe('crossbow-2');
});

it.each(['witch', 'mage'] as const)('lets a %s prefer enchanted weapons when no staff is available', characterType => {
  const inventory = makeInventory('swordDragon', 'swordArcane', 'swordInferno');
  equipBestNpcItems(createNpc({ characterType }), inventory);
  expect(inventory.equipped?.weapon).toBe('swordInferno-2');
});

it('falls back to value when the preferred weapon type is unavailable', () => {
  const inventory = makeInventory('swordSteel', 'staffSkull');
  equipBestNpcItems(createNpc({ characterType: 'ranger' }), inventory);
  expect(inventory.equipped?.weapon).toBe('staffSkull-1');
});

it.each([
  [{ hireCost: 100, iconXY: { x: 2, y: 1 } }, 'bowWarped-0'],
  [{ hireCost: 100, iconXY: { x: 2, y: 1 }, characterType: 'barbarian' }, 'swordDragon-1'],
  [{ hireCost: 0, iconXY: { x: 2, y: 1 } }, 'swordDragon-1'],
  [{ hireCost: 100, iconXY: { x: 2, y: 1 }, monsterType: 'rat' }, 'swordDragon-1'],
  [{ iconXY: { x: 99, y: 99 } }, 'swordDragon-1'],
] satisfies [Partial<NPCState>, string][])('uses catalogue classes only for older hireable NPCs: %o', (npc, expected) => {
  const inventory = makeInventory('bowWarped', 'swordDragon');
  equipBestNpcItems(createNpc(npc), inventory);
  expect(inventory.equipped?.weapon).toBe(expected);
});

it('ignores consumables and scrolls, and clears empty slots', () => {
  const inventory = makeInventory('armourLeather', 'armourPlate', 'healingPotion', 'fireBallScroll');
  inventory.equipped = { weapon: 'removed' };
  equipBestNpcItems(createNpc({ characterType: 'mage' }), inventory);
  expect(inventory.equipped?.armour).toBe('armourPlate-1');
  expect(inventory.equipped?.weapon).toBe(NOTHING_EQUPPED);
  expect(inventory.equipped).not.toHaveProperty('consumable');
  expect(inventory.equipped).not.toHaveProperty('scroll');
});

it.each([
  ['mage', 'glovesEnchanted-1'],
  ['witch', 'glovesEnchanted-1'],
  ['barbarian', 'glovesIron-0'],
  ['ranger', 'glovesIron-0'],
] as const)('chooses gloves by useful bonuses for a %s', (characterType, expected) => {
  const inventory = makeInventory('glovesIron', 'glovesEnchanted');
  equipBestNpcItems(createNpc({ characterType }), inventory);
  expect(inventory.equipped?.gloves).toBe(expected);
});

it.each(['mage', 'witch', 'barbarian', 'ranger'] as const)('values defence and health above price and speed for a %s', characterType => {
  const inventory = makeInventory('armourShadow', 'armourPlate', 'bootsShadow', 'bootsSteel');
  equipBestNpcItems(createNpc({ characterType }), inventory);
  expect(inventory.equipped?.armour).toBe('armourPlate-1');
  expect(inventory.equipped?.boots).toBe('bootsSteel-3');
});

it('uses price to break equal stat scores and preserves the first item on exact ties', () => {
  const inventory = makeInventory('ringSapphire', 'ringRuby', 'ringRuby');
  equipBestNpcItems(createNpc({ characterType: 'mage' }), inventory);
  expect(inventory.equipped?.ring).toBe('ringRuby-1');
});

it('keeps price-based selection for NPCs without an identifiable class', () => {
  const inventory = makeInventory('armourPlate', 'armourShadow');
  equipBestNpcItems(createNpc({ hireCost: 0 }), inventory);
  expect(inventory.equipped?.armour).toBe('armourShadow-1');
});
