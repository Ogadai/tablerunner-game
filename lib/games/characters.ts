import { CharacterListEntry } from "./types";

export const characters: { [id: string]: CharacterListEntry } = {
  barbarian: {
    id: 'barbarian',
    prompt: 'The Barbarian',
    defaultName: 'Glod',
    description: 'A raw warrior who excels in hand-to-hand combat and physical strength',
  },
  witch: {
    id: 'witch',
    prompt: 'The Witch',
    defaultName: 'Tyalana',
    description: 'A powerful user of the dark magical arts',
  }
};
