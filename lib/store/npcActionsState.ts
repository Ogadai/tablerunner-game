'use server'

import { ApiResponse } from "../api-response";
import { PlayerActionsState } from "./types";
import { getNpcActionsStateFromRedis, setNpcActionsStateInRedis } from './redis-access';

export async function getNpcActionsState(boardId: string, mapId: string, npcId: string): Promise<ApiResponse<PlayerActionsState>> {
  try {
    return {
      success: true,
      data: await getNpcActionsStateFromRedis(boardId, mapId, npcId)
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

export async function setNpcActionsState(boardId: string, mapId: string, npcId: string, actionsState: PlayerActionsState): Promise<ApiResponse<NpcActionsState>> {
  try {
    await setNpcActionsStateInRedis(boardId, mapId, npcId, actionsState);
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