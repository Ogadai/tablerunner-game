/** @jest-environment node */
import {
  applyPlayerAddedStats,
  assignNpcAvailableStats,
  ensureNpcCharacterStats,
  INITIAL_NPC_AVAILABLE_STATS,
  levelUpNpc,
  levelUpPlayer,
  pointsForLevel,
  STATS_PER_LEVEL,
} from './level-up';
import { createNpc, createParams } from './test-support/fixtures';
import { EquipableIds, ScrollIds, scrollItems } from '../games/items';
import { SpellIds, spells } from '../games/spells';
import { characters } from '../games/characters';
import { NPC_DATA } from '../games/npc-details';
import type { NPCState } from '../store/types';

it.each([[24, 1, 5], [25, 2, 7], [99, 2, 7], [100, 3, 9]])(
  'awards levels and unspent stats at %i points', async (points, level, availableStats) => {
    const params = createParams();
    const player = params.gameState.players[0];
    player.points = points;
    await levelUpPlayer(params, player);
    expect(player).toMatchObject({ level, availableStats });
    await levelUpPlayer(params, player);
    expect(player.availableStats).toBe(availableStats);
    expect(params.messages.hero.messages).toHaveLength(level > 1 ? 1 : 0);
  },
);

it('never lowers an existing level or takes away stat points', async () => {
  const params = createParams();
  const player = params.gameState.players[0];
  player.level = 5;
  await levelUpPlayer(params, player);
  expect(player).toMatchObject({ level: 5, availableStats: 5 });
});

it('caps allocated stats by the remaining budget and recalculates base stats', async () => {
  const params = createParams();
  const player = params.gameState.players[0];
  player.equipped = {};
  await applyPlayerAddedStats(params, player, { characterStats: {
    strength: 3, skill: 4, reactions: -2, resiliance: 0, intelligence: 2,
  } });
  expect(player.characterStats).toEqual({ strength: 9, skill: 14, reactions: 10, resiliance: 20, intelligence: 10 });
  expect(player.availableStats).toBe(0);
  expect(player.baseStats).toMatchObject({ attack: 9, damage: 9, defence: 11 });
});

it('refreshes equipment bonuses even without allocated stats', async () => {
  const params = createParams();
  const player = params.gameState.players[0];
  player.equipped = {};
  player.characterStats.intelligence = 17;
  await applyPlayerAddedStats(params, player, { characterStats: null });
  expect(player.baseStats?.magic).toBe(17);
  expect(player.availableStats).toBe(5);
});

describe('NPC leveling and stat progression', () => {
  it('computes pointsForLevel matching levelUpNpc thresholds and increments availableStats', async () => {
    expect(pointsForLevel(1)).toBe(0);

    for (const targetLevel of [2, 3, 5]) {
      const below = createNpc({ level: 1, points: pointsForLevel(targetLevel) - 1, availableStats: 0, turnsLeft: undefined });
      await levelUpNpc(createParams(), below);
      expect(below.level).toBe(targetLevel - 1);

      const exact = createNpc({ level: 1, points: pointsForLevel(targetLevel), availableStats: 0, turnsLeft: undefined });
      const params = createParams();
      params.gameState.npcs = [exact];
      await levelUpNpc(params, exact);
      expect(exact.level).toBe(targetLevel);
      expect(exact.availableStats).toBe((targetLevel - 1) * STATS_PER_LEVEL);
      expect(params.messages.hero.messages).toEqual([
        { text: expect.stringContaining(`level ${targetLevel}`) },
      ]);
    }
  });

  it('skips levelUpNpc for summons, monster-typed NPCs, and NPCs without characterStats', async () => {
    const summon = createNpc({ points: 5000, level: 1, availableStats: 0, turnsLeft: 3 });
    const monsterNpc = createNpc({
      points: 5000,
      level: 1,
      availableStats: 0,
      turnsLeft: undefined,
      monsterType: 'zombie' as unknown as NPCState['monsterType'],
    });
    const legacy = createNpc({ points: 5000, level: 1, availableStats: 0, turnsLeft: undefined, characterStats: undefined });

    await levelUpNpc(createParams(), summon);
    await levelUpNpc(createParams(), monsterNpc);
    await levelUpNpc(createParams(), legacy);

    expect(summon.level).toBe(1);
    expect(monsterNpc.level).toBe(1);
    expect(legacy.level).toBe(1);
  });

  it('allocates availableStats according to NPC class priorities and updates baseStats', () => {
    const barbarian = createNpc({
      characterType: 'barbarian',
      characterStats: { ...characters.barbarian.characterStats },
      availableStats: 10,
      turnsLeft: undefined,
    });
    const ranger = createNpc({
      characterType: 'ranger',
      characterStats: { ...characters.ranger.characterStats },
      availableStats: 10,
      equipment: [{ id: 'bow', type: EquipableIds.bowElven }],
      equipped: { weapon: 'bow' },
      turnsLeft: undefined,
    });
    const mage = createNpc({
      characterType: 'mage',
      characterStats: { ...characters.mage.characterStats },
      availableStats: 10,
      turnsLeft: undefined,
    });

    assignNpcAvailableStats(barbarian);
    assignNpcAvailableStats(ranger);
    assignNpcAvailableStats(mage);

    expect(barbarian.availableStats).toBe(0);
    expect(barbarian.characterStats!.strength).toBeGreaterThan(characters.barbarian.characterStats.strength);
    expect(barbarian.baseStats?.health).toBe(barbarian.characterStats!.resiliance);

    expect(ranger.availableStats).toBe(0);
    expect(ranger.characterStats!.skill).toBeGreaterThan(characters.ranger.characterStats.skill);

    expect(mage.availableStats).toBe(0);
    expect(mage.characterStats!.intelligence).toBeGreaterThan(characters.mage.characterStats.intelligence);
    expect(mage.baseStats?.magic).toBe(mage.characterStats!.intelligence);
  });

  it('extra-prioritizes stats needed to learn scrolls, brews, and elixirs in inventory', () => {
    // 1. Mage with a high-intelligence spell scroll
    const mageScroll = Object.values(scrollItems).find(
      item => spells[item.spellId].characterType === 'mage' && spells[item.spellId].intelligence >= 12
    )!;
    const mage = createNpc({
      characterType: 'mage',
      characterStats: { ...characters.mage.characterStats },
      availableStats: 6,
      equipment: [{ id: 'scroll-1', type: mageScroll.id as ScrollIds }],
      equipped: {},
      spells: [],
      turnsLeft: undefined,
    });
    const mageNoScroll = createNpc({
      characterType: 'mage',
      characterStats: { ...characters.mage.characterStats },
      availableStats: 6,
      equipment: [],
      equipped: {},
      spells: [],
      turnsLeft: undefined,
    });
    assignNpcAvailableStats(mage);
    assignNpcAvailableStats(mageNoScroll);
    expect(mage.characterStats!.intelligence).toBeGreaterThanOrEqual(mageNoScroll.characterStats!.intelligence);

    // 2. Barbarian holding Whirlwind brew prioritizes strength
    const barbarian = createNpc({
      characterType: 'barbarian',
      characterStats: { ...characters.barbarian.characterStats },
      availableStats: 6,
      equipment: [{ id: 'brew-1', type: ScrollIds.whirlwind }],
      equipped: {},
      spells: [],
      turnsLeft: undefined,
    });
    const barbarianNoBrew = createNpc({
      characterType: 'barbarian',
      characterStats: { ...characters.barbarian.characterStats },
      availableStats: 6,
      equipment: [],
      equipped: {},
      spells: [],
      turnsLeft: undefined,
    });
    assignNpcAvailableStats(barbarian);
    assignNpcAvailableStats(barbarianNoBrew);
    expect(barbarian.characterStats!.strength).toBeGreaterThanOrEqual(barbarianNoBrew.characterStats!.strength);

    // 3. Ranger holding a ranger elixir with ranged bow prioritizes skill
    const rangerElixir = Object.values(scrollItems).find(
      item => spells[item.spellId].characterType === 'ranger' && spells[item.spellId].intelligence >= 12
    )!;
    const ranger = createNpc({
      characterType: 'ranger',
      characterStats: { ...characters.ranger.characterStats },
      availableStats: 6,
      equipment: [{ id: 'bow', type: EquipableIds.bowElven }, { id: 'elixir-1', type: rangerElixir.id as ScrollIds }],
      equipped: { weapon: 'bow' },
      spells: [],
      turnsLeft: undefined,
    });
    const rangerNoElixir = createNpc({
      characterType: 'ranger',
      characterStats: { ...characters.ranger.characterStats },
      availableStats: 6,
      equipment: [{ id: 'bow', type: EquipableIds.bowElven }],
      equipped: { weapon: 'bow' },
      spells: [],
      turnsLeft: undefined,
    });
    assignNpcAvailableStats(ranger);
    assignNpcAvailableStats(rangerNoElixir);
    expect(ranger.characterStats!.skill).toBeGreaterThanOrEqual(rangerNoElixir.characterStats!.skill);
  });

  it('retro-fits legacy melee and ranged NPCs with availableStats 0 and skips summons/monsters/migrated NPCs', () => {
    const mageTemplate = NPC_DATA.find(n => n.type === 'mage')!;
    const rangerTemplate = NPC_DATA.find(n => n.type === 'ranger')!;

    const legacyMage = createNpc({
      characterType: undefined,
      iconXY: mageTemplate.iconXY,
      hireCost: 50,
      characterStats: undefined,
      level: undefined,
      points: undefined,
      availableStats: undefined,
      turnsLeft: undefined,
      equipment: [],
      equipped: {},
      baseStats: {
        attack: 7, damage: 7, defence: 6, health: 9, magic: 12, speed: 6,
      },
    });
    expect(ensureNpcCharacterStats(legacyMage)).toBe(true);
    expect(legacyMage.characterType).toBe('mage');
    expect(legacyMage.availableStats).toBe(0);
    expect(legacyMage.characterStats).toMatchObject({ strength: 7, intelligence: 12, reactions: 6, resiliance: 9 });
    const expectedMinLevel = 1 + Math.ceil(
      Math.max(0, Object.values(legacyMage.characterStats!).reduce((a, b) => a + b, 0)
        - (Object.values(characters.mage.characterStats).reduce((a, b) => a + b, 0) + INITIAL_NPC_AVAILABLE_STATS))
      / STATS_PER_LEVEL
    );
    expect(legacyMage.level).toBe(expectedMinLevel);
    expect(legacyMage.points).toBe(pointsForLevel(legacyMage.level!));

    const legacyRanger = createNpc({
      characterType: undefined,
      iconXY: rangerTemplate.iconXY,
      hireCost: 65,
      characterStats: undefined,
      level: undefined,
      points: undefined,
      availableStats: undefined,
      turnsLeft: undefined,
      equipment: [{ id: 'bow', type: EquipableIds.bowElven }],
      equipped: { weapon: 'bow' },
      baseStats: {
        attack: 11, damage: 11, defence: 7, health: 10, magic: 6, speed: 7,
      },
    });
    expect(ensureNpcCharacterStats(legacyRanger)).toBe(true);
    expect(legacyRanger.characterStats).toMatchObject({ skill: 11, intelligence: 6, reactions: 7, resiliance: 10 });
    expect(legacyRanger.availableStats).toBe(0);

    // Calling again does not overwrite
    legacyMage.availableStats = 2;
    expect(ensureNpcCharacterStats(legacyMage)).toBe(false);
    expect(legacyMage.availableStats).toBe(2);

    // Skips summons & monsters
    const summon = createNpc({ characterStats: undefined, turnsLeft: 2, hireCost: 0 });
    expect(ensureNpcCharacterStats(summon)).toBe(false);
    const zombie = createNpc({ characterStats: undefined, turnsLeft: undefined, monsterType: 'zombie' as unknown as NPCState['monsterType'] });
    expect(ensureNpcCharacterStats(zombie)).toBe(false);
  });
});
