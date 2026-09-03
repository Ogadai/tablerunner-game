'use server'

import { ApiResponse } from "../api-response";
import { PlayerAddStatsState } from "./types";
import { getPlayerStatsFromRedis, setPlayerStatsInRedis } from './redis-access';

export async function getPlayerAddStatsState(boardId: string, mapId: string, playerId: string): Promise<ApiResponse<PlayerAddStatsState>> {
  try {
    const result = await getPlayerStatsFromRedis(boardId, mapId, playerId);

    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

export async function setPlayerAddStatsState(boardId: string, mapId: string, playerId: string, addStatsState: PlayerAddStatsState): Promise<ApiResponse<null>> {
  try {
    // Store data in Redis
    await setPlayerStatsInRedis(boardId, mapId, playerId, addStatsState);

    return {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    };
  }
}
