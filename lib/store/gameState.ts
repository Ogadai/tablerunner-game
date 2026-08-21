'use server'
import { ApiResponse } from "../api-response";
import { GameState, gameStateOptions } from "./types";

import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

const getGameKey = (boardId: string, mapId: string) => `game:${boardId}:${mapId}`;

export async function getGameState(boardId: string, mapId: string): Promise<ApiResponse<GameState>> {
  try {
    // Fetch data from Redis
    const result = await redis.get(getGameKey(boardId, mapId));

    return {
      success: true,
      data: result as GameState
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

export async function createNewGameState(boardId: string, mapId: string, gameId: string): Promise<ApiResponse<GameState>> {
  const newGameState: GameState = {
    name: `${gameId} on board ${boardId} and map ${mapId}`
  };

  try {
    // Store data in Redis
    await redis.set(getGameKey(boardId, mapId), newGameState, gameStateOptions);
    return {
      success: true,
      data: newGameState
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

export async function deleteGameState(boardId: string, mapId: string): Promise<ApiResponse<null>> {
  try {
    // Delete data from Redis
    await redis.del(getGameKey(boardId, mapId));
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
