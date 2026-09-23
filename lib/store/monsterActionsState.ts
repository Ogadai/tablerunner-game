'use server'

import { ApiResponse } from "../api-response";
import { PlayerActionsState } from "./types";
import { getMonsterActionsStateFromRedis, setMonsterActionsStateInRedis } from './redis-access';

export async function getMonsterActionsState(boardId: string, mapId: string, npcId: string): Promise<ApiResponse<PlayerActionsState>> {
  try {
    return {
      success: true,
      data: await getMonsterActionsStateFromRedis(boardId, mapId, npcId) ?? { actions: [] }
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

export async function setMonsterActionsState(boardId: string, mapId: string, npcId: string, actionsState: PlayerActionsState): Promise<ApiResponse<PlayerActionsState>> {
  try {
    await setMonsterActionsStateInRedis(boardId, mapId, npcId, actionsState);
    return {
      success: true,
      data: actionsState
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    };
  }
}