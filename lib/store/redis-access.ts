import { Redis } from '@upstash/redis';
import { GameTopicMessageType, GameStateUpdatedMessage, ReadyStateUpdatedMessage } from "../message-types";
import { GameState, gameStateOptions, PlayerReadyState } from "./types";
import { publishMessage } from '../messages/message-publisher';

const redis = Redis.fromEnv();

const getGameKey = (boardId: string, mapId: string) => `game:${boardId}:${mapId}`;

const getPlayersReadyKey = (boardId: string, mapId: string) => `playersReady:${boardId}:${mapId}`;

export async function getGameStateFromRedis(boardId: string, mapId: string): Promise<GameState> {
  return await redis.get(getGameKey(boardId, mapId)) as GameState;
}

export async function setGameStateInRedis(boardId: string, mapId: string, newGameState: GameState): Promise<void> {
  await redis.set(getGameKey(boardId, mapId), newGameState, gameStateOptions);
  await publishGameStateUpdated(boardId, mapId);
}

export async function deleteGameStateFromRedis(boardId: string, mapId: string): Promise<void> {
    // Delete data from Redis
    await redis.del(getGameKey(boardId, mapId));

    // Also delete any related game state in Redis
    await deleteReadyStateFromRedis(boardId, mapId);

    await publishGameStateUpdated(boardId, mapId);
}

async function publishGameStateUpdated(boardId: string, mapId: string): Promise<void> {
  const msg: GameStateUpdatedMessage = {
    type: GameTopicMessageType.GameStateUpdated
  };
  await publishMessage(boardId, mapId, msg);
}

export async function getReadyStateFromRedis(boardId: string, mapId: string): Promise<PlayerReadyState> {
  const result = await redis.get(getPlayersReadyKey(boardId, mapId)) as PlayerReadyState;
  return result || {
    readyPlayerIds: []
  };
}

export async function setReadyStateInRedis(boardId: string, mapId: string, newReadyState: PlayerReadyState): Promise<void> {
  await redis.set(getPlayersReadyKey(boardId, mapId), newReadyState, gameStateOptions);
  await publishReadyStateUpdated(boardId, mapId, newReadyState);
}

export async function deleteReadyStateFromRedis(boardId: string, mapId: string): Promise<void> {
      // Delete data from Redis
    await redis.del(getPlayersReadyKey(boardId, mapId));
}

async function publishReadyStateUpdated(boardId: string, mapId: string, newReadyState: PlayerReadyState): Promise<void> {
  const msg: ReadyStateUpdatedMessage = {
    type: GameTopicMessageType.ReadyStateUpdated,
    readyPlayerIds: newReadyState.readyPlayerIds
  };
  await publishMessage(boardId, mapId, msg);
}
