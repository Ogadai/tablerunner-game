'use server'

import { ApiResponse } from "../api-response";
import { GameTopicMessageType, ReadyStateUpdatedMessage } from "../message-types";
import { PlayerReadyState, gameStateOptions } from "./types";
import { publishMessage } from '../messages/message-publisher';

import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

const getPlayersReadyKey = (boardId: string, mapId: string) => `playersReady:${boardId}:${mapId}`;

async function getReadyStateFromRedis(boardId: string, mapId: string): Promise<PlayerReadyState> {
  const result = await redis.get(getPlayersReadyKey(boardId, mapId)) as PlayerReadyState;
  return result || {
    readyPlayerIds: []
  };
}

async function setReadyStateInRedis(boardId: string, mapId: string, newReadyState: PlayerReadyState): Promise<void> {
  await redis.set(getPlayersReadyKey(boardId, mapId), newReadyState, gameStateOptions);
  await publishReadyStateUpdated(boardId, mapId, newReadyState);
}

async function publishReadyStateUpdated(boardId: string, mapId: string, newReadyState: PlayerReadyState): Promise<void> {
  const msg: ReadyStateUpdatedMessage = {
    type: GameTopicMessageType.ReadyStateUpdated,
    readyPlayerIds: newReadyState.readyPlayerIds
  };
  await publishMessage(boardId, mapId, msg);
}

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

export async function deleteReadyState(boardId: string, mapId: string): Promise<ApiResponse<null>> {
  try {
    // Delete data from Redis
    await redis.del(getPlayersReadyKey(boardId, mapId));
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
