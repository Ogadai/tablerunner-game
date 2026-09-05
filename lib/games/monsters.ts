import { MonsterListEntry } from './types';

const DAMAGE_AWARD_RATIO = 20;

export function getPointsForDamage(monsterType: string, damage: number): number {
  const monsterDef = monsters[monsterType];
  const strength = getMonsterStrength(monsterDef);
  return (strength + 0.1) * DAMAGE_AWARD_RATIO * damage;
}

export function getMonsterStrength(monster: MonsterListEntry): number {
  const stats = monster.baseStats;
  const strength = stats.attack + stats.damage + stats.defence + stats.health;

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
    image: '/rat.png',
    icon: '/rat-small.png',
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
    image: '/spider.png',
    icon: '/spider-small.png',
    baseStats: {
      attack: 5,
      damage: 3,
      defence: 4,
      magic: 0,
      health: 5,
      speed: 8,
    },
  },
  'goblin': {
    id: 'goblin',
    name: 'Goblin',
    image: '/goblin.png',
    icon: '/goblin-small.png',
    baseStats: {
      attack: 7,
      damage: 6,
      defence: 5,
      magic: 0,
      health: 8,
      speed: 8,
    },
  },
  'snake': {
    id: 'snake',
    name: 'Snake',
    image: '/snake.png',
    icon: '/snake-small.png',
    baseStats: {
      attack: 6,
      damage: 4,
      defence: 4,
      magic: 0,
      health: 8,
      speed: 9,
    },
  },
  'orc': {
    id: 'orc',
    name: 'Orc',
    image: '/orc.png',
    icon: '/orc-small.png',
    baseStats: {
      attack: 9,
      damage: 7,
      defence: 7,
      magic: 0,
      health: 14,
      speed: 6,
    },
  },
  'skeleton': {
    id: 'skeleton',
    name: 'Skeleton',
    image: '/skeleton.png',
    icon: '/skeleton-small.png',
    baseStats: {
      attack: 8,
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
    image: '/ogre.png',
    icon: '/ogre-small.png',
    baseStats: {
      attack: 12,
      damage: 10,
      defence: 9,
      magic: 0,
      health: 22,
      speed: 4,
    },
  }
};

const monsterRelativeStrengths = getMonsterStrenghtRange();
