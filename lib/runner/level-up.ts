import { characters } from "../games/characters";
import { allItems } from "../games/items";
import { NPC_DATA } from "../games/npc-details";
import { canCharacterLearnSpell, canCharacterUseSpell, getSpellLearningStatValue, isSkillSpell, SpellIds, spells } from "../games/spells";
import { CharacterStats, PlayerItemType, ScrollItemDef } from "../games/types";
import { NPCState, PlayerAddStatsState, PlayerState } from "../store/types";
import { getCombatStats, getPlayerStats, isEquippedWeaponRanged, syncNpcBaseStats } from '../store/playerStats';
import { BaseParams } from "./base-params";
import { playerMessageAtLocation } from './game-messages';

const LEVEL_UP_RATIO = 0.2;
export const STATS_PER_LEVEL = 2;
export const INITIAL_NPC_AVAILABLE_STATS = 5;

export type NpcCharacterType = NonNullable<NPCState['characterType']>;
const CHARACTER_TYPES: readonly NpcCharacterType[] = ['barbarian', 'witch', 'ranger', 'mage'];
const STAT_KEYS: readonly (keyof CharacterStats)[] = ['strength', 'skill', 'reactions', 'resiliance', 'intelligence'];

const NPC_STAT_WEIGHTS: Record<NpcCharacterType, CharacterStats> = {
  barbarian: { strength: 0.40, resiliance: 0.30, reactions: 0.20, skill: 0.10, intelligence: 0 },
  ranger: { skill: 0.40, resiliance: 0.25, reactions: 0.25, strength: 0.10, intelligence: 0 },
  witch: { intelligence: 0.45, resiliance: 0.25, reactions: 0.25, strength: 0.025, skill: 0.025 },
  mage: { intelligence: 0.45, resiliance: 0.25, reactions: 0.25, strength: 0.025, skill: 0.025 },
};

const SCROLL_PRIORITY_WEIGHT = 0.7;

export function pointsForLevel(level: number): number {
  return Math.pow(Math.max(0, level - 1) / LEVEL_UP_RATIO, 2);
}

function applyLevelUp(
  params: BaseParams,
  characterId: string,
  currentLevel: number,
  points: number,
  currentAvailableStats: number,
): { level: number; availableStats: number } {
  const newLevel = calculateLevelFromPoints(points);

  if (newLevel > currentLevel) {
    playerMessageAtLocation(params, characterId,
      `**{player}** went up to **level ${newLevel}**`
    );

    return {
      level: newLevel,
      availableStats: currentAvailableStats + (newLevel - currentLevel) * STATS_PER_LEVEL,
    };
  }

  return { level: currentLevel, availableStats: currentAvailableStats };
}

export async function levelUpPlayer(params: BaseParams, player: PlayerState): Promise<void> {
  const next = applyLevelUp(params, player.id, player.level, player.points, player.availableStats || 0);
  player.level = next.level;
  player.availableStats = next.availableStats;
}

export async function levelUpNpc(params: BaseParams, npc: NPCState): Promise<void> {
  if (!npc.characterStats || npc.monsterType || npc.turnsLeft) return;

  const next = applyLevelUp(params, npc.id, npc.level ?? 1, npc.points ?? 0, npc.availableStats || 0);
  npc.level = next.level;
  npc.availableStats = next.availableStats;
}

export async function applyPlayerAddedStats(params: BaseParams, player: PlayerState, addStats: PlayerAddStatsState): Promise<void> {
  if (addStats !== null && !!addStats.characterStats) {
    for(const statKey of Object.keys(addStats.characterStats) as (keyof CharacterStats)[]) {
      const addAmount = Math.min(addStats.characterStats[statKey], player.availableStats);
      if (addAmount > 0) {
        player.characterStats[statKey] += addAmount;
        player.availableStats -= addAmount;
      }
    }
  }
  player.baseStats = getPlayerStats(player);
}

export function resolveNpcCharacterType(npc: Pick<NPCState, 'characterType' | 'monsterType' | 'turnsLeft' | 'hireCost' | 'iconXY'>): NpcCharacterType | undefined {
  if (npc.characterType && CHARACTER_TYPES.includes(npc.characterType)) {
    return npc.characterType;
  }
  if (!npc.monsterType && !npc.turnsLeft && npc.hireCost > 0 && npc.iconXY) {
    return NPC_DATA.find(entry => entry.iconXY.x === npc.iconXY.x && entry.iconXY.y === npc.iconXY.y)?.type;
  }
  return undefined;
}

function sumCharacterStats(stats: CharacterStats): number {
  return STAT_KEYS.reduce((total, key) => total + stats[key], 0);
}

/** Find the stat needed for the closest usable unlearned scroll, brew, or elixir. */
function getPendingScrollStatPriority(npc: NPCState): keyof CharacterStats | null {
  if (!npc.characterStats || npc.equipment.length === 0) return null;
  const combatStats = getCombatStats(npc);
  const ranged = isEquippedWeaponRanged(npc);

  let bestStat: keyof CharacterStats | null = null;
  let smallestDeficit = Infinity;

  for (const item of npc.equipment) {
    const itemDef = allItems[item.type];
    if (!itemDef || itemDef.type !== PlayerItemType.scroll) continue;
    const scrollDef = itemDef as ScrollItemDef;
    const spell = spells[scrollDef.spellId];
    if (!spell || npc.spells.includes(scrollDef.spellId as SpellIds) || !canCharacterUseSpell(npc, spell)) continue;
    if (canCharacterLearnSpell(npc, combatStats, spell)) continue;

    const deficit = spell.intelligence - getSpellLearningStatValue(spell, combatStats);
    if (deficit > 0 && deficit < smallestDeficit) {
      smallestDeficit = deficit;
      bestStat = isSkillSpell(spell) ? (ranged ? 'skill' : 'strength') : 'intelligence';
    }
  }

  return bestStat;
}

function getEffectiveStatWeights(baseWeights: CharacterStats, priorityStat: keyof CharacterStats | null): CharacterStats {
  if (!priorityStat) return baseWeights;

  const currentPriorityWeight = baseWeights[priorityStat];
  const remainingBaseWeight = 1 - currentPriorityWeight;
  const remainingTargetWeight = 1 - SCROLL_PRIORITY_WEIGHT;
  const nextWeights = { ...baseWeights };

  for (const stat of STAT_KEYS) {
    if (stat === priorityStat) {
      nextWeights[stat] = SCROLL_PRIORITY_WEIGHT;
    } else if (remainingBaseWeight > 0) {
      nextWeights[stat] = (baseWeights[stat] / remainingBaseWeight) * remainingTargetWeight;
    }
  }

  return nextWeights;
}

export function assignNpcAvailableStats(npc: NPCState, { randomize = false }: { randomize?: boolean } = {}): void {
  const characterType = resolveNpcCharacterType(npc);
  if (!characterType || !npc.characterStats || !npc.availableStats || npc.availableStats <= 0) return;

  npc.characterType = characterType;
  const baseWeights = NPC_STAT_WEIGHTS[characterType];

  while (npc.availableStats > 0) {
    syncNpcBaseStats(npc);
    const priorityStat = getPendingScrollStatPriority(npc);
    const weights = getEffectiveStatWeights(baseWeights, priorityStat);
    const nextTotal = sumCharacterStats(npc.characterStats) + 1;

    let chosenStat: keyof CharacterStats | null = null;
    let bestScore = -Infinity;

    for (const stat of STAT_KEYS) {
      if (weights[stat] <= 0) continue;
      const deficit = nextTotal * weights[stat] - npc.characterStats[stat];
      const jitter = randomize ? Math.random() * 1.5 : 0;
      const score = deficit + jitter;
      if (score > bestScore) {
        bestScore = score;
        chosenStat = stat;
      }
    }

    if (!chosenStat) break;
    npc.characterStats[chosenStat] += 1;
    npc.availableStats -= 1;
  }

  syncNpcBaseStats(npc);
}

/** Retro-fit characterStats, level, and points onto pre-existing character NPCs without changing power. */
export function ensureNpcCharacterStats(npc: NPCState): boolean {
  if (npc.characterStats || npc.monsterType || npc.turnsLeft || !npc.baseStats) {
    return false;
  }

  const characterType = resolveNpcCharacterType(npc);
  if (!characterType) {
    return false;
  }

  npc.characterType = characterType;
  const resiliance = Math.max(1, npc.baseStats.health);
  const intelligence = Math.max(1, npc.baseStats.magic);
  const reactions = Math.max(1, npc.baseStats.speed);
  const ranged = isEquippedWeaponRanged(npc);
  const primaryCombat = Math.max(1, npc.baseStats.attack, npc.baseStats.damage);
  const secondaryCombat = Math.max(1, npc.baseStats.defence * 3 - 2 - reactions - primaryCombat);

  npc.characterStats = {
    strength: ranged ? secondaryCombat : primaryCombat,
    skill: ranged ? primaryCombat : secondaryCombat,
    reactions,
    resiliance,
    intelligence,
  };

  const baseTotal = sumCharacterStats(characters[characterType].characterStats) + INITIAL_NPC_AVAILABLE_STATS;
  const currentTotal = sumCharacterStats(npc.characterStats);
  const level = 1 + Math.ceil(Math.max(0, currentTotal - baseTotal) / STATS_PER_LEVEL);

  npc.level = level;
  npc.points = pointsForLevel(level);
  npc.availableStats = 0;
  syncNpcBaseStats(npc);
  return true;
}

function calculateLevelFromPoints(points: number): number {
  return 1 + Math.floor(Math.sqrt(points) * LEVEL_UP_RATIO);
}
