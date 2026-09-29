'use server'

import { ApiResponse } from "../api-response";
import { PlayerReadyState } from "./types";
import { LocationMoveDirection } from "../games/types";
import { getReadyStateFromRedis, setReadyStateInRedis, lockReadyStateInRedis, publishReadyStateUpdated } from './redis-access';
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

export async function setPlayerReady(boardId: string, mapId: string, playerId: string, ready: boolean, direction?: LocationMoveDirection): Promise<ApiResponse<null>> {
  let readyLock: (() => Promise<void>) | null = null;
  try {
    readyLock = await lockReadyStateInRedis(boardId, mapId);
    const currentState = await getReadyStateFromRedis(boardId, mapId);

    const newState: PlayerReadyState = {
      readyPlayerIds: currentState.readyPlayerIds.filter(p => p !== playerId),
      readyPlayerDirection: { ...currentState.readyPlayerDirection }
    };

    if (ready) {
      newState.readyPlayerIds.push(playerId);
      if (direction) {
        newState.readyPlayerDirection![playerId] = direction;
      }
    } else {
      delete newState.readyPlayerDirection![playerId];
    }

    // Store data in Redis
    await setReadyStateInRedis(boardId, mapId, newState, { notify: false });

    // Clients apply snapshots directly, so keep them ordered with readiness writes.
    // Publication is bounded and must not prevent a saved update from processing.
    await notifyPlayerReady(boardId, mapId, newState);

    // The five-second readiness lock only protects the readiness update, not turn execution.
    await readyLock();
    readyLock = null;

    if (ready) {
      await checkAllPlayersReady(boardId, mapId);
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
  finally {
    if (readyLock) {
      await readyLock();
    }
  }
}

async function notifyPlayerReady(boardId: string, mapId: string, state: PlayerReadyState): Promise<void> {
  try {
    await publishReadyStateUpdated(boardId, mapId, state);
  } catch (error) {
    console.error('Failed to publish readiness update', error);
  }
}
