'use server'
import { ApiResponse } from "../api-response";
import { GameListEntry } from "./types";
import { games } from './games';

export async function getGamesForMap(mapId: string): Promise<ApiResponse<GameListEntry[]>> {
  const mapGames = games.filter((game) => game.map === mapId);
  if (mapGames.length === 0) {
    return { success: false, error: `No games found for map ${mapId}` };
  } else {
    return { success: true, data: mapGames };
  }
}
