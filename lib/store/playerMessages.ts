'use server'

import { ApiResponse } from "../api-response";
import { PlayerMessagesState } from "./types";
import { getPlayerMessagesFromRedis } from './redis-access';

export async function getPlayerMessages(boardId: string, mapId: string, playerId: string): Promise<ApiResponse<PlayerMessagesState>> {
  try {
    const result = await getPlayerMessagesFromRedis(boardId, mapId, playerId);

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
