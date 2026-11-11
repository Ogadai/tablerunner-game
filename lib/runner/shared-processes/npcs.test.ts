/** @jest-environment node */
import { getNpcSpells, npcs } from './npcs';
import { allItems, ConsumableIds, EquipableIds } from '../../games/items';
import { spells } from '../../games/spells';
import { createParams } from '../test-support/fixtures';

// Keep name availability independent of the production name catalogue.
jest.mock('../../games/npc-details', () => ({
  NPC_DATA: [
    { type: 'witch', race: 'human', gender: 'male', iconXY: { x: 1, y: 1 } },
    { type: 'ranger', race: 'elf', gender: 'female', iconXY: { x: 2, y: 1 } },
  ],
  NPC_NAMES: ['witch', 'ranger'].flatMap(type => Array.from({ length: 30 }, (_, i) => ({
    type, race: type === 'witch' ? 'human' : 'elf', gender: type === 'witch' ? 'male' : 'female', name: `${type} ${i}`,
  }))),
}));
afterEach(() => jest.restoreAllMocks());

it.each([[0, 11, true], [0.5, 17, false]] as const)('generates populated NPCs at configured shops (%s)', async (roll, count, caster) => {
  jest.spyOn(Math, 'random').mockReturnValue(roll);
  const params = createParams();
  await npcs.setup!(params);
  const generated = params.gameState.npcs;
  expect(generated).toHaveLength(count);
  expect(new Set(generated.map(n => n.id)).size).toBe(count);
  expect(new Set(generated.map(n => n.name)).size).toBe(count);
  expect(new Set(generated.map(n => n.location.id))).toEqual(new Set([110, 91, 58, 22, 121, 23]));
  for (const npc of generated) {
    expect(npc.characterType).toBe(caster ? 'witch' : 'ranger');
    expect(npc.level).toBeGreaterThanOrEqual(1);
    expect(npc.points).toBeGreaterThanOrEqual(0);
    expect(npc.availableStats).toBe(0);
    expect(npc.characterStats).toBeDefined();
    const weaponBonuses = allItems[npc.equipment[0].type].bonusStats;
    expect(npc.health).toBe(npc.baseStats!.health + (weaponBonuses?.health ?? 0));
    expect(npc.magic).toBe(npc.baseStats!.magic + (weaponBonuses?.magic ?? 0));
    expect(npc.hireCost).toBeGreaterThanOrEqual(60);
    expect(npc.masterId).toBeNull();
    expect(npc.equipment[0].type).toBe(caster ? EquipableIds.staffRuby : EquipableIds.bowElven);
    expect(npc.equipped.weapon).toBe(npc.equipment[0].id);
    expect(npc.equipment.some(item => item.type === ConsumableIds.manaPotion)).toBe(caster);
    expect(npc.spells.length).toBeGreaterThan(0);
  }
});

it('derives starting NPC level, XP points, and allocated characterStats from hireCost', async () => {
  const { calculateNpcLevelFromCost, createNpcProgression } = await import('./npcs');
  const { INITIAL_NPC_AVAILABLE_STATS, pointsForLevel, STATS_PER_LEVEL } = await import('../level-up');
  const { characters } = await import('../../games/characters');

  jest.spyOn(Math, 'random').mockReturnValue(0.5);
  const lowCostLevel = calculateNpcLevelFromCost(45);
  const highCostLevel = calculateNpcLevelFromCost(80);
  expect(lowCostLevel).toBe(1);
  expect(highCostLevel).toBeGreaterThan(lowCostLevel);

  const prog = createNpcProgression('barbarian', 80, [], {});
  expect(prog.level).toBe(highCostLevel);
  expect(prog.points).toBe(pointsForLevel(highCostLevel));
  expect(prog.availableStats).toBe(0);

  const baseSum = Object.values(characters.barbarian.characterStats).reduce((a, b) => a + b, 0);
  const actualSum = Object.values(prog.characterStats!).reduce((a, b) => a + b, 0);
  expect(actualSum).toBe(baseSum + INITIAL_NPC_AVAILABLE_STATS + (highCostLevel - 1) * STATS_PER_LEVEL);
  expect(prog.baseStats!.health).toBe(prog.characterStats!.resiliance);
});

it.each([
  ['mage', 60, 4, 3, 1, 20],
  ['mage', 100, 5, 4, 1, 25],
  ['mage', 130, 5, 3, 2, 25],
  ['mage', 160, 6, 4, 2, 30],
  ['witch', 60, 4, 3, 1, 20],
  ['witch', 130, 5, 3, 2, 20],
  ['witch', 160, 5, 3, 2, 30],
  ['barbarian', 60, 4, 3, 1, 20],
  ['barbarian', 130, 5, 3, 2, 24],
  ['ranger', 60, 4, 3, 1, 21],
  ['ranger', 130, 5, 3, 2, 24],
] as const)('gives a %s at cost %i %i unique spells with appropriate levels and power', (type, cost, expectedTotal, expectedLow, expectedHigh, maxInt) => {
  jest.spyOn(Math, 'random').mockReturnValue(0.99);
  const npcSpells = getNpcSpells(type, cost);
  expect(npcSpells).toHaveLength(expectedTotal);
  expect(new Set(npcSpells).size).toBe(expectedTotal);

  const lowLevel = npcSpells.filter(id => spells[id].intelligence < 20);
  const highLevel = npcSpells.filter(id => spells[id].intelligence >= 20);
  expect(lowLevel).toHaveLength(expectedLow);
  expect(highLevel).toHaveLength(expectedHigh);
  expect(Math.max(...highLevel.map(id => spells[id].intelligence))).toBe(maxInt);
});
