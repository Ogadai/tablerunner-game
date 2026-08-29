import { GameListEntry } from "./types";
import { characters } from './characters';

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
    locations: [
      {
        id: 10,
        description: 'A dusty crossroads offers you five different ways to go',
        move: [
          { direction: 'n', id: 31 },
          { direction: 'ne', id: 30 },
          { direction: 'nw', id: 32 },
          { direction: 'e', id: 11 },
          { direction: 'w', id: 9 }
        ]
      },
      {
        id: 9,
        description: 'A bend in the western road',
        move: [
          { direction: 'n', id: 32 },
          { direction: 'w', id: 10 }
        ]
      },
      {
        id: 32,
        description: 'A fork in the western road',
        move: [
          { direction: 'e', id: 31 },
          { direction: 'se', id: 10 },
          { direction: 's', id: 9 }
        ]
      },
      {
        id: 31,
        description: 'A fork in the northern road',
        move: [
          { direction: 'e', id: 30 },
          { direction: 'w', id: 32 },
          { direction: 's', id: 10 }
        ]
      },
      {
        id: 30,
        description: 'A fork in the eastern road',
        move: [
          { direction: 'w', id: 31 },
          { direction: 'sw', id: 10 },
          { direction: 's', id: 11 }
        ]
      },
      {
        id: 11,
        description: 'A bend in the eastern road',
        move: [
          { direction: 'n', id: 30 },
          { direction: 'w', id: 10 }
        ]
      },
    ]
  }
];
