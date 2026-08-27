import { CharacterListEntry } from "./types";

export const characters: { [id: string]: CharacterListEntry } = {
  barbarian: {
    id: 'barbarian',
    prompt: 'The Barbarian',
    defaultName: 'Glod',
    description: 'A warrior who excels at hand-to-hand combat',
    image: '/barbarian.png',
    icon: '/barbarian-small.png',
  },
  witch: {
    id: 'witch',
    prompt: 'The Witch',
    defaultName: 'Tyalana',
    description: 'A powerful user of the dark magical arts',
    image: '/witch.png',
    icon: '/witch-small.png',
  },
  ranger: {
    id: 'ranger',
    prompt: 'The Ranger',
    defaultName: 'Yalni',
    description: 'A skilled fighter specialising in ranged combat',
    image: '/ranger.png',
    icon: '/ranger-small.png',
  },
  mage: {
    id: 'mage',
    prompt: 'The Mage',
    defaultName: 'Lornar',
    description: 'A learned magician of great skill',
    image: '/mage.png',
    icon: '/mage-small.png',
  }
};
