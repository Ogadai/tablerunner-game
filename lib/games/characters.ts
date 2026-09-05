import { CharacterListEntry } from "./types";
import { allItems } from './items';

export const characters: { [id: string]: CharacterListEntry } = {
  barbarian: {
    id: 'barbarian',
    prompt: 'The Barbarian',
    description: 'A warrior who excels at hand-to-hand combat',
    image: '/barbarian.png',
    icon: '/barbarian-small.png',
    rgbColour: '403018',
    characterStats: {
      strength: 10,
      skill: 3,
      reactions: 4,
      resiliance: 8,
      intelligence: 1,
    },
    equipment: [
      allItems.swordRusty,
      allItems.healingPotion,
      allItems.healingPotion,
      allItems.resurrectionStore,
    ]
  },
  witch: {
    id: 'witch',
    prompt: 'The Witch',
    description: 'A powerful user of the dark magical arts',
    image: '/witch.png',
    icon: '/witch-small.png',
    rgbColour: '411E47',
    characterStats: {
      strength: 3,
      skill: 4,
      reactions: 5,
      resiliance: 5,
      intelligence: 10,
    },
    equipment: [
      allItems.staffSkull,
      allItems.healingPotion,
      allItems.healingPotion,
      allItems.resurrectionStore,
    ]
  },
  ranger: {
    id: 'ranger',
    prompt: 'The Ranger',
    description: 'A skilled fighter specialising in ranged combat',
    image: '/ranger.png',
    icon: '/ranger-small.png',
    rgbColour: '303E15',
    characterStats: {
      strength: 6,
      skill: 10,
      reactions: 4,
      resiliance: 7,
      intelligence: 3,
    },
    equipment: [
      allItems.bowWarped,
      allItems.healingPotion,
      allItems.healingPotion,
      allItems.resurrectionStore,
    ]
  },
  mage: {
    id: 'mage',
    prompt: 'The Mage',
    description: 'A learned magician of great skill',
    image: '/mage.png',
    icon: '/mage-small.png',
    rgbColour: '222F5B',
    characterStats: {
      strength: 4,
      skill: 3,
      reactions: 4,
      resiliance: 6,
      intelligence: 10,
    },
    equipment: [
      allItems.staffOrb,
      allItems.healingPotion,
      allItems.healingPotion,
      allItems.resurrectionStore,
    ]
  }
};
