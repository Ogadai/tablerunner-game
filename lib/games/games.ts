import { GameListEntry } from "./types";
import { characters } from './characters';

export const games: GameListEntry[] = [
  {
    id: 'cauldronfire',
    name: 'Cauldron of Fire',
    map: 'test',
    description: 'Explore the lands of the volcano and defeat the evil king.',
    heroImage: '/hero-barbarian-witch.png',
    characters: [
      { ...characters.barbarian },
      { ...characters.witch },
      { ...characters.mage },
      { ...characters.ranger }
    ]
  }
];
