'use server'
import { ApiResponse } from "../api-response";
import { GameTopicMessageType, getGameTopicId } from "../message-types";
import { GameState, gameStateOptions, PlayerState } from "./types";
import { games } from '../games/games';

import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

const getGameKey = (boardId: string, mapId: string) => `game:${boardId}:${mapId}`;
const getGameTopic = (boardId: string, mapId: string) => `game:${getGameTopicId(boardId, mapId)}`;

async function getGameStateFromRedis(boardId: string, mapId: string): Promise<GameState> {
  return await redis.get(getGameKey(boardId, mapId)) as GameState;
}

async function setGameStateInRedis(boardId: string, mapId: string, newGameState: GameState): Promise<void> {
  await redis.set(getGameKey(boardId, mapId), newGameState, gameStateOptions);
  await publishGameStateUpdated(boardId, mapId);
}

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
    return {
      success: true,
      data: await getGameStateFromRedis(boardId, mapId)
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

export async function createNewGameState(boardId: string, mapId: string, gameId: string): Promise<ApiResponse<GameState>> {
  const gameDef = games.find(g => g.id === gameId);
  if (!gameDef) {
    return {
      success: false,
      error: `Couldn't find game id ${gameId}`
    };
  }

  const newGameState: GameState = {
    name: `${gameId} on board ${boardId} and map ${mapId}`,
    characters: gameDef.characters,
    players: [],
  };

  try {
    // Store data in Redis
    await setGameStateInRedis(boardId, mapId, newGameState);
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

export async function createPlayerForGame(boardId: string, mapId: string, player: PlayerState): Promise<ApiResponse<null>> {
  try {
    // Get game from Redis
    const gameState = await getGameStateFromRedis(boardId, mapId);
    if (!gameState) {
      throw Error(`Couldn't find Game state for game`);
    }

    if (gameState.players.find(p => p.id === player.id)) {
      return {
        success: false,
        error: `Player ${player.id} has already been created`
      };
    }

    const newGameState = {
      ...gameState,
      players: [...gameState.players, player]
    };

    // Store data in Redis
    await setGameStateInRedis(boardId, mapId, newGameState);

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

export async function deletePlayerFromGame(boardId: string, mapId: string, playerId: string): Promise<ApiResponse<null>> {
  try {
    // Get game from Redis
    const gameState = await getGameStateFromRedis(boardId, mapId);

    const newGameState = {
      ...gameState,
      players: gameState.players.filter(p => p.id !== playerId)
    };

    // Store data in Redis
    await setGameStateInRedis(boardId, mapId, newGameState);

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
