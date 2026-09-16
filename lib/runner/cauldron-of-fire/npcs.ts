import { ConsumableIds, EquipableIds } from "@/lib/games/items";
import { BaseParams } from "../base-params";
import { ProcessRunner } from "../types";
import { NPC_DATA, NPC_NAMES } from '@/lib/games/npc-details';
import { NPCState } from "@/lib/store/types";
import { BaseStats, PlayerItem } from "@/lib/games/types";
import { SpellIds } from "@/lib/games/spells";

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
    min: 0,
    max: 2,
    from: 60,
    to: 100, 
  },
  {
    location: 58, // tavern
    min: 1,
    max: 3,
    from: 80,
    to: 150, 
  },
  {
    location: 22, // village market
    min: 1,
    max: 2,
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
    min: 1,
    max: 2,
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

const generateStat = (cost: number, importance: number): number => {
  const max = 0.2 * cost * importance;
  const min = max * 0.75;

  return Math.ceil(min + Math.random() * (max - min));
};

const getNpcStats: { [type: string]: ((cost: number) => BaseStats) } = {
  'barbarian': (cost: number) => {
    return {
      attack: generateStat(cost, 1),
      defence: generateStat(cost, 1),
      damage: generateStat(cost, 0.8),
      health: generateStat(cost, 0.8),
      magic: generateStat(cost, 0.1),
      speed: generateStat(cost, 0.5),
    };
  },
  'ranger': (cost: number) => {
    return {
      attack: generateStat(cost, 0.9),
      defence: generateStat(cost, 0.8),
      damage: generateStat(cost, 0.7),
      health: generateStat(cost, 0.7),
      magic: generateStat(cost, 0.1),
      speed: generateStat(cost, 0.8),
    };
  },
  'witch': (cost: number) => {
    return {
      attack: generateStat(cost, 0.3),
      defence: generateStat(cost, 0.2),
      damage: generateStat(cost, 0.3),
      health: generateStat(cost, 0.4),
      magic: generateStat(cost, 1),
      speed: generateStat(cost, 0.6),
    };
  },
  'mage': (cost: number) => {
    return {
      attack: generateStat(cost, 0.3),
      defence: generateStat(cost, 0.2),
      damage: generateStat(cost, 0.3),
      health: generateStat(cost, 0.4),
      magic: generateStat(cost, 1),
      speed: generateStat(cost, 0.6),
    };
  },
};

function generateNpc(params: BaseParams, mapNpc: IMapNpc): NPCState | null {
  const magicUser = Math.random() < 0.2;
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
  const baseStats = getNpcStats[type](cost);

  const npcId = `npc-${params.gameState.npcs.length + 1}`;
  const name = pickName(params, type, race, gender);
  if (!name) {
    return null;
  }

  const equipment = getNpcEquipment(npcId, type);
  return {
    id: npcId,
    masterId: null,
    name: name,
    location: { id: mapNpc.location, description: '', move: [] },
    magic: 0,
    spells: getNpcSpells(type, cost),
    equipment: equipment,
    equipped: {
      weapon: equipment[0].id,
    },
    baseStats: baseStats,
    hireCost: cost,
    iconXY: iconXY,
    health: baseStats.health,
  };
}

function getNpcEquipment(npcId: string, type: string): PlayerItem[] {
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

function getNpcSpells(type: string, cost: number): SpellIds[] {
  const pick = (spells: SpellIds[], count: number): SpellIds[] => spells;

  switch(type) {
    case 'barbarian':
    case 'ranger':
      return [];
    case 'witch':
      return [
        SpellIds.iceShards,
        SpellIds.fear,
        ...pick([
          SpellIds.iceStorm,
          SpellIds.terror,
          SpellIds.lightning,
          SpellIds.shieldWall,
          SpellIds.strengthAura,
        ], Math.ceil(cost / 50))
      ];
    case 'mage':
      return [
        SpellIds.spiritArrow,
        SpellIds.heal,
        ...pick([
          SpellIds.fireBall,
          SpellIds.fireWall,
          SpellIds.healingAura,
          SpellIds.strengthAura,
          SpellIds.fireRain,
          SpellIds.shield,
        ], Math.ceil(cost / 50))
      ];
  }
  return [];
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
