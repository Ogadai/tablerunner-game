import { SpellIds } from './spells';
import { MonsterListEntry } from './types';

const DAMAGE_AWARD_RATIO = 20;

export function getPointsForDamage(monsterType: string, damage: number): number {
  const monsterDef = monsters[monsterType];
  const strength = getMonsterStrength(monsterDef);
  return (strength + 0.1) * DAMAGE_AWARD_RATIO * damage;
}

export function getMonsterStrength(monster: MonsterListEntry): number {
  const stats = monster.baseStats;
  const strength = stats.attack + stats.damage + stats.defence + stats.magic + stats.health;

  return Math.max(0, Math.min(1,
    (strength - monsterRelativeStrengths.weakest)
      / (monsterRelativeStrengths.strongest - monsterRelativeStrengths.weakest)
  ));
}

function getMonsterStrenghtRange(): { weakest: number, strongest: number } {
  const strengths = Object.values(monsters).map(monsterDef => {
    const monsterStats = monsterDef.baseStats;
    return monsterStats.attack + monsterStats.damage + monsterStats.defence + monsterStats.health;
  });
  return {
    weakest: Math.min(...strengths),
    strongest: Math.max(...strengths)
  };
}

export const monsters: { [id: string]: MonsterListEntry } = {
  'rat': {
    id: 'rat',
    name: 'Rat',
    iconXY: { x: 4, y: 2 },
    baseStats: {
      attack: 4,
      damage: 2,
      defence: 2,
      magic: 0,
      health: 5,
      speed: 5
    },
  },
  'spider': {
    id: 'spider',
    name: 'Spider',
    iconXY: { x: 8, y: 2 },
    baseStats: {
      attack: 5,
      damage: 3,
      defence: 4,
      magic: 0,
      health: 5,
      speed: 8,
    },
  },
  'snake': {
    id: 'snake',
    name: 'Snake',
    iconXY: { x: 7, y: 2 },
    baseStats: {
      attack: 6,
      damage: 4,
      defence: 4,
      magic: 0,
      health: 8,
      speed: 9,
    },
  },
  'goblin': {
    id: 'goblin',
    name: 'Goblin',
    iconXY: { x: 6, y: 0 },
    baseStats: {
      attack: 7,
      damage: 6,
      defence: 5,
      magic: 0,
      health: 8,
      speed: 8,
    },
  },
  'wyvern': {
    id: 'wyvern',
    name: 'Wyvern',
    iconXY: { x: 8, y: 1 },
    baseStats: {
      attack: 8,
      damage: 7,
      defence: 5,
      magic: 0,
      health: 10,
      speed: 12,
    },
  },
  'orc': {
    id: 'orc',
    name: 'Orc',
    iconXY: { x: 9, y: 0 },
    baseStats: {
      attack: 9,
      damage: 7,
      defence: 7,
      magic: 0,
      health: 14,
      speed: 6,
    },
  },
  'scorpion': {
    id: 'scorpion',
    name: 'Scorpion',
    iconXY: { x: 5, y: 2 },
    baseStats: {
      attack: 9,
      damage: 10,
      defence: 9,
      magic: 0,
      health: 10,
      speed: 8,
    },
  },
  'wildcat': {
    id: 'wildcat',
    name: 'Wildcat',
    iconXY: { x: 9, y: 2 },
    baseStats: {
      attack: 11,
      damage: 9,
      defence: 10,
      magic: 0,
      health: 13,
      speed: 15,
    },
  },
  'zombie': {
    id: 'zombie',
    name: 'Zombie',
    iconXY: { x: 9, y: 1 },
    baseStats: {
      attack: 12,
      damage: 8,
      defence: 8,
      magic: 0,
      health: 10,
      speed: 4,
    },
  },
  'bandit': {
    id: 'bandit',
    name: 'Bandit',
    iconXY: { x: 7, y: 0 },
    baseStats: {
      attack: 10,
      damage: 11,
      defence: 11,
      magic: 0,
      health: 15,
      speed: 8,
    },
  },
  'hydra': {
    id: 'hydra',
    name: 'Hydra',
    iconXY: { x: 5, y: 4 },
    baseStats: {
      attack: 20,
      damage: 10,
      defence: 14,
      magic: 0,
      health: 20,
      speed: 30,
    },
  },
  'troll': {
    id: 'troll',
    name: 'Troll',
    iconXY: { x: 8, y: 3 },
    baseStats: {
      attack: 11,
      damage: 14,
      defence: 12,
      magic: 0,
      health: 20,
      speed: 6,
    },
  },
  'skeleton': {
    id: 'skeleton',
    name: 'Skeleton',
    iconXY: { x: 6, y: 2 },
    baseStats: {
      attack: 12,
      damage: 8,
      defence: 9,
      magic: 2,
      health: 16,
      speed: 4,
    },
  },
  'ogre': {
    id: 'ogre',
    name: 'Ogre',
    iconXY: { x: 7, y: 1 },
    baseStats: {
      attack: 12,
      damage: 10,
      defence: 9,
      magic: 0,
      health: 22,
      speed: 4,
    },
  },
  'oculusfiend': {
    id: 'oculusfiend',
    name: 'Oculus Fiend',
    iconXY: { x: 9, y: 3 },
    baseStats: {
      attack: 6,
      damage: 5,
      defence: 12,
      magic: 20,
      health: 25,
      speed: 6,
    },
    spells: [
      SpellIds.fear,
      SpellIds.terror,
      SpellIds.iceShards,
      SpellIds.iceStorm,
    ]
  },
  'cyclops': {
    id: 'cyclops',
    name: 'Cyclops',
    iconXY: { x: 8, y: 0 },
    baseStats: {
      attack: 14,
      damage: 15,
      defence: 12,
      magic: 0,
      health: 25,
      speed: 5,
    },
  },
  'rocktroll': {
    id: 'rocktroll',
    name: 'Rock Troll',
    iconXY: { x: 7, y: 4 },
    baseStats: {
      attack: 12,
      damage: 18,
      defence: 20,
      magic: 0,
      health: 25,
      speed: 6,
    },
  },
  'squizard': {
    id: 'squizard',
    name: 'Squizard',
    iconXY: { x: 4, y: 4 },
    baseStats: {
      attack: 6,
      damage: 5,
      defence: 10,
      magic: 30,
      health: 20,
      speed: 6,
    },
    spells: [
      SpellIds.fireBall,
      SpellIds.fireWall,
      SpellIds.lightning,
      SpellIds.fireRain,
    ]
  },
  'minotaur': {
    id: 'minotaur',
    name: 'Minotaur',
    iconXY: { x: 5, y: 1 },
    baseStats: {
      attack: 17,
      damage: 15,
      defence: 15,
      magic: 0,
      health: 30,
      speed: 5,
    },
  },
  'firespirit': {
    id: 'firespirit',
    name: 'Fire Spirit',
    iconXY: { x: 7, y: 3 },
    baseStats: {
      attack: 15,
      damage: 20,
      defence: 120,
      magic: 0,
      health: 20,
      speed: 10,
    },
  },
  'lich': {
    id: 'lich',
    spells: [
      SpellIds.iceShards,
      SpellIds.iceStorm,
      SpellIds.terror,
      SpellIds.lightning,
      SpellIds.raiseDead,
      SpellIds.animateCorpse,
      SpellIds.familiar,
    ],

    name: 'Lich',
    iconXY: { x: 4, y: 1 },
    baseStats: {
      attack: 25,
      damage: 20,
      defence: 30,
      magic: 30,
      health: 30,
      speed: 5,
    },
  },
  'dragonbaby': {
    id: 'dragonbaby',
    name: 'Juvenile Dragon',
    iconXY: { x: 5, y: 0 },
    baseStats: {
      attack: 20,
      damage: 18,
      defence: 22,
      magic: 20,
      health: 30,
      speed: 11,
    },
    spells: [
      SpellIds.fireBreathSmall,
    ],
  },
  'skeletaldragon': {
    id: 'skeletaldragon',
    name: 'Skeletal Dragon',
    iconXY: { x: 6, y: 4 },
    baseStats: {
      attack: 16,
      damage: 12,
      defence: 14,
      magic: 20,
      health: 15,
      speed: 10,
    },
    spells: [
      SpellIds.fireBreathSmall,
    ],
  },
  'dragon': {
    id: 'dragon',
    name: 'Fire Dragon',
    iconXY: { x: 4, y: 0 },
    baseStats: {
      attack: 30,
      damage: 25,
      defence: 28,
      magic: 40,
      health: 60,
      speed: 20,
    },
    spells: [
      SpellIds.fireBreathLarge,
    ],
  },
  'spiriteagle': {
    id: 'spiriteagle',
    name: 'Spirit Eagle',
    iconXY: { x: 4, y: 3 },
    baseStats: {
      attack: 8,
      damage: 7,
      defence: 5,
      magic: 0,
      health: 10,
      speed: 12,
    },
  },
  'spiritwolf': {
    id: 'spiritwolf',
    name: 'Spirit Wolf',
    iconXY: { x: 5, y: 3 },
    baseStats: {
      attack: 10,
      damage: 11,
      defence: 11,
      magic: 0,
      health: 15,
      speed: 8,
    },
  },
  'spiritbear': {
    id: 'spiritbear',
    name: 'Spirit Bear',
    iconXY: { x: 6, y: 3 },
    baseStats: {
      attack: 12,
      damage: 10,
      defence: 9,
      magic: 0,
      health: 22,
      speed: 4,
    },
  },
};

const monsterRelativeStrengths = getMonsterStrenghtRange();

export const mostersExcludeFromAutoPopulate: string[] = [
  'bandit',
  'zombie',
  'dragonbaby',
  'dragon',
  'lich',
  'spiriteagle',
  'spiritwolf',
  'spiritbear',
  'skeletaldragon',
  'firespirit',
];
