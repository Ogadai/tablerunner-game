import { Redis } from '@upstash/redis';
import { GameTopicMessageType, GameStateUpdatedMessage, ReadyStateUpdatedMessage } from "../message-types";
import { GameState, gameStateOptions, PlayerReadyState, PlayerActionsState, AllMonsterState } from "./types";
import { publishMessage } from '../messages/message-publisher';

const redis = Redis.fromEnv();

const getGameKey = (boardId: string, mapId: string) => `game:${boardId}:${mapId}`;

const getPlayersReadyKey = (boardId: string, mapId: string) => `playersReady:${boardId}:${mapId}`;

const getPlayerActionsKey = (boardId: string, mapId: string, playerId: string) => `playerActions:${boardId}:${mapId}:${playerId}`;

const getMonstersKey = (boardId: string, mapId: string) => `monsters:${boardId}:${mapId}`;

/* Overall Game State */

export async function getGameStateFromRedis(boardId: string, mapId: string): Promise<GameState> {
  return await redis.get(getGameKey(boardId, mapId)) as GameState;
}

export async function setGameStateInRedis(boardId: string, mapId: string, newGameState: GameState): Promise<void> {
  await redis.set(getGameKey(boardId, mapId), newGameState, gameStateOptions);
  await publishGameStateUpdated(boardId, mapId);
}

export async function deleteGameStateFromRedis(boardId: string, mapId: string): Promise<void> {
  const gameState = await redis.get(getGameKey(boardId, mapId)) as GameState;

  if (gameState) {
    // Delete data from Redis
    await redis.del(getGameKey(boardId, mapId));

    // Also delete any related game state in Redis
    await deleteReadyStateFromRedis(boardId, mapId);

    for(const player of gameState.players) {
      await deleteActionsStateFromRedis(boardId, mapId, player.id);
    }

    // Delete the monsters state from Redis
    await deleteMonstersStateFromRedis(boardId, mapId);

    await publishGameStateUpdated(boardId, mapId);
  }
}

async function publishGameStateUpdated(boardId: string, mapId: string): Promise<void> {
  const msg: GameStateUpdatedMessage = {
    type: GameTopicMessageType.GameStateUpdated
  };
  await publishMessage(boardId, mapId, msg);
}

/* All Players "Ready" State */

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

/* Individual Player Actions State */

export async function getActionsStateFromRedis(boardId: string, mapId: string, playerId: string): Promise<PlayerActionsState> {
  const result = await redis.get(getPlayerActionsKey(boardId, mapId, playerId)) as PlayerActionsState;
  return result || { actions: [] };
}

export async function setActionsStateInRedis(boardId: string, mapId: string, playerId: string, newActionsState: PlayerActionsState): Promise<void> {
  await redis.set(getPlayerActionsKey(boardId, mapId, playerId), newActionsState, gameStateOptions);
}

export async function deleteActionsStateFromRedis(boardId: string, mapId: string, playerId: string): Promise<void> {
  await redis.del(getPlayerActionsKey(boardId, mapId, playerId));
}

/* Monsters State */

export async function getMonstersStateFromRedis(boardId: string, mapId: string): Promise<AllMonsterState> {
  const result = await redis.get(getMonstersKey(boardId, mapId)) as AllMonsterState;
  return result || { monsters: [] };
}

export async function setMonstersStateInRedis(boardId: string, mapId: string, monsterState: AllMonsterState): Promise<void> {
  await redis.set(getMonstersKey(boardId, mapId), monsterState, gameStateOptions);
}

export async function deleteMonstersStateFromRedis(boardId: string, mapId: string): Promise<void> {
  await redis.del(getMonstersKey(boardId, mapId));
}
