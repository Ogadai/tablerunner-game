import { ConsumableIds, EquipableIds } from "@/lib/games/items";
import { characters } from "@/lib/games/characters";
import { BaseParams } from "../base-params";
import { ProcessRunner } from "../types";
import { NPC_DATA, NPC_NAMES } from '@/lib/games/npc-details';
import { NPCState, PlayerInventoryEquipSlots } from "@/lib/store/types";
import { CharacterStats, PlayerItem } from "@/lib/games/types";
import { SpellIds, spells } from "@/lib/games/spells";
import { getNamedTargetStats } from "@/lib/store/playerStats";
import {
  assignNpcAvailableStats,
  INITIAL_NPC_AVAILABLE_STATS,
  NpcCharacterType,
  pointsForLevel,
  STATS_PER_LEVEL,
} from "../level-up";

interface IMapNpc { location: number, min: number, max: number, from: number, to: number };

const MAP_NPCS: IMapNpc[] = [
  {
    location: 110, // tavern
    min: 2,
    max: 4,
    from: 60,
    to: 120, 
  },
  {
    location: 91, // village square
    min: 1,
    max: 3,
    from: 60,
    to: 100, 
  },
  {
    location: 58, // tavern
    min: 2,
    max: 4,
    from: 80,
    to: 150, 
  },
  {
    location: 22, // village market
    min: 1,
    max: 3,
    from: 60,
    to: 130, 
  },
  {
    location: 121, // tavern
    min: 3,
    max: 4,
    from: 90,
    to: 180, 
  },
  {
    location: 23, // general store
    min: 2,
    max: 4,
    from: 80,
    to: 140, 
  },
];

const NPC_TYPES: ('barbarian' | 'witch' | 'ranger' | 'mage')[] = ['barbarian', 'ranger', 'witch', 'mage'];
const NPC_RACES: ('human' | 'elf' | 'dwarf')[] = ['human', 'elf', 'dwarf'];
const NPC_GENDERS: ('male' | 'female')[] = ['male', 'female'];

function pickName(
  params: BaseParams,
  type: 'barbarian' | 'witch' | 'ranger' | 'mage',
  race: 'human' | 'elf' | 'dwarf',
  gender: 'male' | 'female'
): string | undefined {
  const availableNames = NPC_NAMES.filter(n =>
    n.type === type && n.race === race && n.gender === gender
    && !params.gameState.npcs.find(npc => npc.name === n.name)
  );

  return availableNames && availableNames[Math.floor(Math.random() * availableNames.length)].name;
}

export function calculateNpcLevelFromCost(cost: number): number {
  return Math.max(1, 1 + Math.round((cost - 45) / 13));
}

export function createNpcProgression(
  type: NpcCharacterType,
  cost: number,
  equipment: PlayerItem[],
  equipped: PlayerInventoryEquipSlots,
  { minResilience = 1 }: { minResilience?: number } = {},
): Pick<NPCState, 'characterStats' | 'level' | 'points' | 'availableStats' | 'baseStats'> {
  const level = calculateNpcLevelFromCost(cost);
  const points = pointsForLevel(level);
  const startingStats: CharacterStats = { ...characters[type].characterStats };
  if (startingStats.resiliance < minResilience) {
    startingStats.resiliance = minResilience;
  }

  const draftNpc: NPCState = {
    id: 'draft',
    characterType: type,
    masterId: null,
    name: '',
    location: { id: 0, description: '', move: [] },
    magic: 0,
    spells: [],
    equipment,
    equipped,
    hireCost: cost,
    iconXY: { x: 0, y: 0 },
    health: 0,
    team: null,
    characterStats: startingStats,
    level,
    points,
    availableStats: INITIAL_NPC_AVAILABLE_STATS + (level - 1) * STATS_PER_LEVEL,
  };
  assignNpcAvailableStats(draftNpc, { randomize: true });

  return {
    characterStats: draftNpc.characterStats!,
    level,
    points,
    availableStats: draftNpc.availableStats!,
    baseStats: draftNpc.baseStats!,
  };
}

function generateNpc(params: BaseParams, mapNpc: IMapNpc): NPCState | null {
  const magicUser = Math.random() < 0.33;
  const type = NPC_TYPES[Math.floor(Math.random() * 2 + (magicUser ? 2 : 0))];
  const race = NPC_RACES[Math.floor(Math.random() * NPC_RACES.length)];

  let gender = NPC_GENDERS[Math.floor(Math.random() * NPC_GENDERS.length)];
  let iconList = NPC_DATA.filter(d => d.type === type && d.race === race && d.gender === gender);
  if (iconList.length === 0) {
    gender = (gender === 'female' ? 'male' : 'female');
    iconList = NPC_DATA.filter(d => d.type === type && d.race === race && d.gender === gender);
  }

  const iconXY = iconList[Math.floor(Math.random() * iconList.length)].iconXY;

  const cost = mapNpc.from + Math.floor(Math.random() * (mapNpc.to - mapNpc.from + 1));

  const npcId = `npc-${params.gameState.npcs.length + 1}`;
  const name = pickName(params, type, race, gender);
  if (!name) {
    return null;
  }

  const equipment = getNpcEquipment(npcId, type);
  const equipped = { weapon: equipment[0].id };
  const progression = createNpcProgression(type, cost, equipment, equipped);
  const stats = getNamedTargetStats(progression.baseStats!, { equipment, equipped });
  return {
    id: npcId,
    characterType: type,
    masterId: null,
    name: name,
    location: { id: mapNpc.location, description: '', move: [] },
    magic: stats.magic,
    spells: getNpcSpells(type, cost),
    equipment: equipment,
    equipped: equipped,
    ...progression,
    hireCost: cost,
    iconXY: iconXY,
    health: stats.health,
    team: null,
  };
}

export function getNpcEquipment(npcId: string, type: string): PlayerItem[] {
  switch(type) {
    case 'barbarian':
      return [{
          id: `${npcId}-weapon`,
          type: EquipableIds.axeBattle,
        }, {
          id: `${npcId}-heal-1`,
          type: ConsumableIds.healingPotion,
        }, {
          id: `${npcId}-heal-2`,
          type: ConsumableIds.healingPotion,
        }];
    case 'ranger':
      return [{
          id: `${npcId}-weapon`,
          type: EquipableIds.bowElven,
        }, {
          id: `${npcId}-heal-1`,
          type: ConsumableIds.healingPotion,
        }, {
          id: `${npcId}-heal-2`,
          type: ConsumableIds.healingPotion,
        }];
    case 'witch':
    case 'mage':
      return [{
          id: `${npcId}-weapon`,
          type: EquipableIds.staffRuby,
        }, {
          id: `${npcId}-heal-1`,
          type: ConsumableIds.healingPotion,
        }, {
          id: `${npcId}-mana-1`,
          type: ConsumableIds.manaPotion,
        }];
  }
  return [];
}

const NPC_LOW_SPELLS: Record<string, SpellIds[]> = {
  barbarian: [
    SpellIds.rage,
    SpellIds.mightyCleave,
    SpellIds.warCry,
    SpellIds.ironSkin,
    SpellIds.whirlwind,
  ],
  ranger: [
    SpellIds.focus,
    SpellIds.pinningShot,
    SpellIds.evasiveStep,
    SpellIds.multiShot,
    SpellIds.poisonArrow,
  ],
  witch: [
    SpellIds.iceShards,
    SpellIds.fear,
    SpellIds.iceStorm,
  ],
  mage: [
    SpellIds.spiritArrow,
    SpellIds.heal,
    SpellIds.fireBall,
    SpellIds.shield,
    SpellIds.strength,
    SpellIds.tangleTwist,
  ],
};

const NPC_HIGH_SPELLS: Record<string, SpellIds[]> = {
  barbarian: [
    SpellIds.bloodthirst,
    SpellIds.berserker,
  ],
  ranger: [
    SpellIds.sniperShot,
    SpellIds.callCompanion,
  ],
  witch: [
    SpellIds.terror,
    SpellIds.poisonCloud,
    SpellIds.lightning,
  ],
  mage: [
    SpellIds.fireWall,
    SpellIds.healingAura,
    SpellIds.timeWarp,
    SpellIds.shieldWall,
    SpellIds.strengthAura,
    SpellIds.fireRain,
  ],
};

function pickRandomSpells(pool: SpellIds[], count: number): SpellIds[] {
  const available = [...pool];
  const picked: SpellIds[] = [];
  const total = Math.min(count, available.length);
  for (let i = 0; i < total; i++) {
    const index = Math.floor(Math.random() * available.length);
    picked.push(available.splice(index, 1)[0]);
  }
  return picked;
}

export function getNpcSpells(type: string, cost: number = 100): SpellIds[] {
  const lowPool = NPC_LOW_SPELLS[type];
  const highPool = NPC_HIGH_SPELLS[type];
  if (!lowPool || !highPool) {
    return [];
  }

  const maxHighIntelligence = cost >= 140 ? 30 : cost >= 100 ? 25 : 21;
  const eligibleHighPool = highPool.filter(id => spells[id].intelligence <= maxHighIntelligence);

  const highCount = cost >= 120 ? 2 : 1;
  const lowCount = cost >= 140 || (cost >= 100 && cost < 120) ? 4 : 3;

  return [
    ...pickRandomSpells(lowPool, lowCount),
    ...pickRandomSpells(eligibleHighPool, highCount),
  ];
}

export const npcs: ProcessRunner = {
  async setup(params: BaseParams): Promise<void> {
    for(const mapNpc of MAP_NPCS) {
      const count = mapNpc.min + Math.floor(Math.random() * (mapNpc.max - mapNpc.min + 1))
      for(let n = 0; n < count; n++) {
        const npc = generateNpc(params, mapNpc);
        if (npc) {
          params.gameState.npcs.push(npc)
        }
      }
    }
  }
}
