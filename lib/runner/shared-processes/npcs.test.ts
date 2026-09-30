/** @jest-environment node */
import { npcs } from './npcs';
import { ConsumableIds, EquipableIds } from '../../games/items';
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

it.each([[0, 8, true], [0.5, 14, false]] as const)('generates populated NPCs at configured shops (%s)', async (roll, count, caster) => {
  jest.spyOn(Math, 'random').mockReturnValue(roll);
  const params = createParams();
  await npcs.setup!(params);
  const generated = params.gameState.npcs;
  expect(generated).toHaveLength(count);
  expect(new Set(generated.map(n => n.id)).size).toBe(count);
  expect(new Set(generated.map(n => n.name)).size).toBe(count);
  expect(new Set(generated.map(n => n.location.id))).toEqual(new Set(roll === 0 ? [110, 58, 22, 121, 23] : [110, 91, 58, 22, 121, 23]));
  for (const npc of generated) {
    expect(npc.health).toBe(npc.baseStats!.health);
    expect(npc.hireCost).toBeGreaterThanOrEqual(60);
    expect(npc.masterId).toBeNull();
    expect(npc.equipment[0].type).toBe(caster ? EquipableIds.staffRuby : EquipableIds.bowElven);
    expect(npc.equipped.weapon).toBe(npc.equipment[0].id);
    expect(npc.equipment.some(item => item.type === ConsumableIds.manaPotion)).toBe(caster);
    expect(npc.spells.length > 0).toBe(caster);
  }
});
