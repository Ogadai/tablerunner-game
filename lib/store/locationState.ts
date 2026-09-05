'use server'

import { ApiResponse } from "../api-response";
import { LocationState } from "./types";
import { getLocationsStateFromRedis } from './redis-access';

export async function getLocationState(boardId: string, mapId: string, location: number): Promise<ApiResponse<LocationState>> {
  try {
    const monsterState = await getLocationsStateFromRedis(boardId, mapId);
    const data: LocationState = {
      monsters: monsterState.monsters.filter(m => m.location === location),
      items: monsterState.items.filter(i => i.location === location),
    };

    return {
      success: true,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    };
  }
}
