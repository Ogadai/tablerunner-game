import { CharacterListEntry } from "./types";

export const characters: { [id: string]: CharacterListEntry } = {
  barbarian: {
    id: 'barbarian',
    prompt: 'The Barbarian',
    defaultName: 'Glod',
    description: 'A warrior who excels at hand-to-hand combat and physical strength',
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
  }
};
