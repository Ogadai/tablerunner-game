import { GameListEntry } from "./types";
import { characters } from './characters';
import { cauldronOfFire } from './maps';

export const games: GameListEntry[] = [
  {
    id: 'cauldronfire',
    name: 'Cauldron of Fire',
    map: 'cauldron',
    description: 'Explore the lands of the volcano and defeat the evil king.',
    heroImage: '/hero-barbarian-witch.png',
    characters: [
      { ...characters.barbarian },
      { ...characters.witch },
      { ...characters.mage },
      { ...characters.ranger }
    ],
    startLocation: 10,
    locations: cauldronOfFire
  }
];
