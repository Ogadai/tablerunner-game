'use server'

import { ApiResponse } from "../api-response";
import { PlayerReadyState } from "./types";
import { getReadyStateFromRedis, setReadyStateInRedis, getGameStateFromRedis } from './redis-access';
import { checkAllPlayersReady } from '../runner/game-runner';

export async function getPlayerReadyState(boardId: string, mapId: string): Promise<ApiResponse<PlayerReadyState>> {
  try {
    const result = await getReadyStateFromRedis(boardId, mapId);

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

export async function setPlayerReady(boardId: string, mapId: string, playerId: string, ready: boolean): Promise<ApiResponse<null>> {
  try {
    const currentState = (await getReadyStateFromRedis(boardId, mapId));

    const newState: PlayerReadyState = {
      readyPlayerIds: currentState.readyPlayerIds.filter(p => p !== playerId)
    };

    if (ready) {
      newState.readyPlayerIds.push(playerId);
    }

    // Store data in Redis
    await setReadyStateInRedis(boardId, mapId, newState);

    if (ready) {
      checkAllPlayersReady(boardId, mapId, newState);
    }

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
