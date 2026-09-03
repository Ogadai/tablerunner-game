import { MonsterListEntry } from './types';

const DAMAGE_AWARD_RATIO = 0.1;

export function getPointsForDamage(monsterType: string, damage: number): number {
  const monsterDef = monsters[monsterType];
  return damage
    * monsterDef.baseStats.attack
    * monsterDef.baseStats.damage
    * monsterDef.baseStats.defence
    * DAMAGE_AWARD_RATIO;
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
      attack: 4,
      damage: 2,
      defence: 2,
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
      attack: 6,
      damage: 4,
      defence: 4,
      magic: 0,
      health: 8,
      speed: 6,
    },
  },
  'skeleton': {
    id: 'skeleton',
    name: 'Skeleton',
    image: '/skeleton.png',
    icon: '/skeleton-small.png',
    baseStats: {
      attack: 12,
      damage: 10,
      defence: 10,
      magic: 0,
      health: 20,
      speed: 7,
    },
  }
};