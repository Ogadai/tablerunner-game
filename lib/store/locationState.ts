'use server'

import { ApiResponse } from "../api-response";
import { LocationState } from "./types";
import { getGameStateFromRedis, getLocationAndInventoryFromRedis, getLocationsStateFromRedis } from './redis-access';
import { games } from '../games/games';
import { getFastTravelLocations } from '../runner/fast-travel-locations';

export async function getAvailableFastTravelLocations(boardId: string, mapId: string, playerId: string): Promise<ApiResponse<number[]>> {
  try {
    const [gameState, locationsState] = await Promise.all([
      getGameStateFromRedis(boardId, mapId), getLocationsStateFromRedis(boardId, mapId),
    ]);
    const player = gameState.players.find(candidate => candidate.id === playerId);
    const game = games.find(candidate => candidate.id === gameState.gameId);
    if (!player || !game) throw new Error('Player or game not found');
    const data = getFastTravelLocations({
      gameState: { ...gameState, npcs: locationsState.npcs ?? gameState.npcs },
      monsters: locationsState.monsters,
    }, game.locations, player);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getLocationState(
  boardId: string,
  mapId: string,
  location: number,
  playerId?: string,
): Promise<ApiResponse<LocationState>> {
  try {
    const { locations, inventory } = playerId
      ? await getLocationAndInventoryFromRedis(boardId, mapId, playerId)
      : { locations: await getLocationsStateFromRedis(boardId, mapId), inventory: undefined };

    const data: LocationState = {
      monsters: locations.monsters.filter(m => m.location === location),
      items: locations.items.filter(i => i.location === location),
      npcs: (locations.npcs || []).filter(npc => npc.location.id === location),
      ...(inventory ? { inventory } : {}),
    };

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    };
  }
}
