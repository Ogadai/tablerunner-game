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
    ],
    startLocation: 120,
    locations: [
      {
        id: 120,
        description: 'A dusty crossroads offers you five different ways to go',
        move: [
          { direction: 'n', id: 121 },
          { direction: 'ne', id: 122 },
          { direction: 'e', id: 119 },
          { direction: 'se', id: 82 },
          { direction: 's', id: 81 }
        ]
      },
      {
        id: 121,
        description: 'A bend in the northern road',
        move: [
          { direction: 's', id: 120 },
          { direction: 'e', id: 122 }
        ]
      },
      {
        id: 122,
        description: 'A fork in the northern road',
        move: [
          { direction: 'w', id: 121 },
          { direction: 'sw', id: 120 },
          { direction: 's', id: 119 }
        ]
      },
      {
        id: 119,
        description: 'A fork in the eastern road',
        move: [
          { direction: 'n', id: 122 },
          { direction: 'w', id: 120 },
          { direction: 's', id: 82 }
        ]
      },
      {
        id: 82,
        description: 'A fork in the southern road',
        move: [
          { direction: 'n', id: 119 },
          { direction: 'nw', id: 120 },
          { direction: 'w', id: 81 }
        ]
      },
      {
        id: 81,
        description: 'A bend in the southern road',
        move: [
          { direction: 'n', id: 120 },
          { direction: 'e', id: 82 }
        ]
      },
    ]
  }
];
