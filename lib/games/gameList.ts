'use server'
import { ApiResponse } from "../api-response";
import { GameListEntry } from "./types";
import { characters } from './characters';

export const gameList: GameListEntry[] = [
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

export async function getGamesForMap(mapId: string): Promise<ApiResponse<GameListEntry[]>> {
  const games = gameList.filter((game) => game.map === mapId);
  if (games.length === 0) {
    return { success: false, error: `No games found for map ${mapId}` };
  } else {
    return { success: true, data: games };
  }
}
