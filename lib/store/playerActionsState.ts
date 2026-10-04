'use server'

import { ApiResponse } from "../api-response";
import { PlayerAction, PlayerActionsState, PlayerActionType } from "./types";
import { getActionsStateFromRedis, lockPlayerActionsInRedis, setActionsStateInRedis } from './redis-access';

export async function getPlayerActionsState(boardId: string, mapId: string, playerId: string): Promise<ApiResponse<PlayerActionsState>> {
  try {
    const result = await getActionsStateFromRedis(boardId, mapId, playerId);

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

export async function addPlayerAction(boardId: string, mapId: string, playerId: string, action: PlayerAction): Promise<ApiResponse<PlayerActionsState>> {
  let actionsLock: (() => Promise<void>) | null = null;
  try {
    actionsLock = await lockPlayerActionsInRedis(boardId, mapId, playerId);
    const currentState = (await getActionsStateFromRedis(boardId, mapId, playerId));
    const newState: PlayerActionsState = {
      ...currentState,
      actions: [
        ...currentState.actions.filter(a => {
          return action.type !== PlayerActionType.Move || a.type !== PlayerActionType.Move
        }),
        { ...action }
      ]
    };

    // Store data in Redis
    await setActionsStateInRedis(boardId, mapId, playerId, newState);

    return {
      success: true,
      data: newState
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    };
  } finally {
    if (actionsLock) {
      await actionsLock();
    }
  }
}

export async function removePlayerAction(boardId: string, mapId: string, playerId: string, actionId: number): Promise<ApiResponse<PlayerActionsState>> {
  let actionsLock: (() => Promise<void>) | null = null;
  try {
    actionsLock = await lockPlayerActionsInRedis(boardId, mapId, playerId);
    const currentState = (await getActionsStateFromRedis(boardId, mapId, playerId));
    const newState: PlayerActionsState = {
      ...currentState,
      actions: currentState.actions.filter(action => action.id !== actionId),
    };

    // Store data in Redis
    await setActionsStateInRedis(boardId, mapId, playerId, newState);

    return {
      success: true,
      data: newState
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    };
  } finally {
    if (actionsLock) {
      await actionsLock();
    }
  }
} 
