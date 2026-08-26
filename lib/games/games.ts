import { GameListEntry } from "./types";
import { characters } from './characters';

export const games: GameListEntry[] = [
  {
    id: 'test1',
    name: 'Test Game 1',
    map: 'test',
    description: 'This is a test game for testing purposes.',
    heroImage: '/hero-barbarian-witch.png',
    characters: [
      characters.barbarian,
      characters.witch
    ]
  }
];
