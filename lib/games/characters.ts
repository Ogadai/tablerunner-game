import { CharacterListEntry } from "./types";

export const characters: { [id: string]: CharacterListEntry } = {
  barbarian: {
    id: 'barbarian',
    prompt: 'The Barbarian',
    defaultName: 'Glod',
    description: 'A warrior who excels at hand-to-hand combat',
    image: '/barbarian.png',
    icon: '/barbarian-small.png',
    rgbColour: '403018',
    characterStats: {
      strength: 10,
      skill: 3,
      speed: 4,
      resiliance: 8,
      magic: 1,
    },
  },
  witch: {
    id: 'witch',
    prompt: 'The Witch',
    defaultName: 'Tyalana',
    description: 'A powerful user of the dark magical arts',
    image: '/witch.png',
    icon: '/witch-small.png',
    rgbColour: '411E47',
    characterStats: {
      strength: 3,
      skill: 4,
      speed: 5,
      resiliance: 5,
      magic: 10,
    },
  },
  ranger: {
    id: 'ranger',
    prompt: 'The Ranger',
    defaultName: 'Yalni',
    description: 'A skilled fighter specialising in ranged combat',
    image: '/ranger.png',
    icon: '/ranger-small.png',
    rgbColour: '303E15',
    characterStats: {
      strength: 6,
      skill: 10,
      speed: 4,
      resiliance: 7,
      magic: 3,
    },
  },
  mage: {
    id: 'mage',
    prompt: 'The Mage',
    defaultName: 'Lornar',
    description: 'A learned magician of great skill',
    image: '/mage.png',
    icon: '/mage-small.png',
    rgbColour: '222F5B',
    characterStats: {
      strength: 4,
      skill: 3,
      speed: 4,
      resiliance: 6,
      magic: 10,
    },
  }
};
