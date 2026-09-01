import { MonsterListEntry } from './types';

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
    },
  }
};