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
  expect(highCostLevel).toBe(4);
  expect(calculateNpcLevelFromCost(200)).toBe(13);

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

describe('late-game NPC respawning', () => {
  it('does not respawn on turn 0 or non-interval turns', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const params = createParams();

    for (const turn of [0, 50, 99, 101]) {
      params.gameState.turn = turn;
      await npcs.executeForTurn!(params);
      expect(params.gameState.npcs).toHaveLength(0);
    }
  });

  it('replenishes depleted spawn locations at turn 100 with 120-250 coin NPCs and skips stocked locations', async () => {
    const { calculateNpcLevelFromCost } = await import('./npcs');
    const { createNpc } = await import('../test-support/fixtures');
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const params = createParams();
    await npcs.setup!(params);

    // Keep location 121 stocked with 3 un-hired alive NPCs; deplete all other locations
    // (location 110 has a hired NPC, a dead un-hired NPC, and a zero-cost quest NPC, none of which count).
    params.gameState.npcs = [
      ...params.gameState.npcs.filter(n => n.location.id === 121).slice(0, 3),
      createNpc({ id: 'npc-hired', masterId: 'p1', location: { id: 110, description: '', move: [] }, hireCost: 100 }),
      createNpc({ id: 'npc-dead', masterId: null, health: 0, location: { id: 110, description: '', move: [] }, hireCost: 100 }),
      createNpc({ id: 'npc-quest', masterId: null, health: 10, location: { id: 110, description: '', move: [] }, hireCost: 0 }),
    ];
    // Ensure at least 3 un-hired NPCs exist at 121 even if setup rolled 3
    while (params.gameState.npcs.filter(n => n.location.id === 121).length < 3) {
      params.gameState.npcs.push(createNpc({
        id: `npc-121-${params.gameState.npcs.length}`,
        masterId: null,
        location: { id: 121, description: '', move: [] },
        hireCost: 100,
      }));
    }
    const initialIds = new Set(params.gameState.npcs.map(n => n.id));
    const countAt121Before = params.gameState.npcs.filter(n => n.location.id === 121).length;

    params.gameState.turn = 100;
    await npcs.executeForTurn!(params);

    expect(params.gameState.npcs.filter(n => n.location.id === 121)).toHaveLength(countAt121Before);
    const spawned = params.gameState.npcs.filter(n => !initialIds.has(n.id));
    expect(spawned.length).toBeGreaterThanOrEqual(8); // mins of 110(2), 91(1), 58(2), 22(1), 23(2)
    expect(new Set(spawned.map(n => n.id)).size).toBe(spawned.length);

    for (const npc of spawned) {
      expect(npc.masterId).toBeNull();
      expect(npc.hireCost).toBeGreaterThanOrEqual(120);
      expect(npc.hireCost).toBeLessThanOrEqual(250);
      expect(npc.level).toBe(calculateNpcLevelFromCost(npc.hireCost));
      expect(npc.level).toBeGreaterThanOrEqual(7);
    }
  });

  it('scales NPC cost and level higher at turn 200 than turn 100 and avoids ID collisions', async () => {
    const { createNpc } = await import('../test-support/fixtures');
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const params = createParams();
    params.gameState.npcs = [
      createNpc({ id: 'npc-2', masterId: 'p1', location: { id: 1, description: '', move: [] }, hireCost: 80 }),
    ];

    params.gameState.turn = 200;
    await npcs.executeForTurn!(params);

    const spawned = params.gameState.npcs.filter(n => n.id !== 'npc-2');
    expect(spawned.length).toBeGreaterThan(0);
    expect(new Set(params.gameState.npcs.map(n => n.id)).size).toBe(params.gameState.npcs.length);
    for (const npc of spawned) {
      expect(npc.hireCost).toBeGreaterThanOrEqual(180);
      expect(npc.hireCost).toBeLessThanOrEqual(350);
      expect(npc.level).toBeGreaterThanOrEqual(11);
    }
  });
});
