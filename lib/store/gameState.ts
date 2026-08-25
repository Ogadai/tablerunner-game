'use server'
import { ApiResponse } from "../api-response";
import { GameTopicMessageType, getGameTopicId } from "../message-types";
import { GameState, gameStateOptions } from "./types";

import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

const getGameKey = (boardId: string, mapId: string) => `game:${boardId}:${mapId}`;
const getGameTopic = (boardId: string, mapId: string) => `game:${getGameTopicId(boardId, mapId)}`;

async function publishGameStateUpdated(boardId: string, mapId: string): Promise<void> {
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    throw new Error('ABLY_API_KEY is not configured');
  }

  const response = await fetch(
    `https://rest.ably.io/channels/${encodeURIComponent(getGameTopic(boardId, mapId))}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(apiKey).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: GameTopicMessageType.GameStateUpdated,
        data: { type: GameTopicMessageType.GameStateUpdated },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to publish game state update: ${response.status}`);
  }
}

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
    await publishGameStateUpdated(boardId, mapId);
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
    await publishGameStateUpdated(boardId, mapId);
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
