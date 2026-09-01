'use server'

import { ApiResponse } from "../api-response";
import { GameState, PlayerState } from "./types";
import { BaseStats, CharacterStats } from "../games/types";
import { games } from '../games/games';
import { characters } from '../games/characters';
import { getGameStateFromRedis, setGameStateInRedis, deleteGameStateFromRedis } from './redis-access';

export async function getGameState(boardId: string, mapId: string): Promise<ApiResponse<GameState>> {
  try {
    const result = await getGameStateFromRedis(boardId, mapId);

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

export async function createNewGameState(boardId: string, mapId: string, gameId: string): Promise<ApiResponse<GameState>> {
  const gameDef = games.find(g => g.id === gameId);
  if (!gameDef) {
    return {
      success: false,
      error: `Couldn't find game id ${gameId}`
    };
  }

  const newGameState: GameState = {
    gameId,
    name: `${gameId} on board ${boardId} and map ${mapId}`,
    characters: gameDef.characters,
    players: [],
    visited: [gameDef.startLocation]
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
    await deleteGameStateFromRedis(boardId, mapId);

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

export async function createPlayerForGame(boardId: string, mapId: string, playerId: string): Promise<ApiResponse<null>> {
  try {
    // Get game from Redis
    const gameState = await getGameStateFromRedis(boardId, mapId);
    if (!gameState) {
      throw Error(`Couldn't find Game state for game`);
    }
    const gameDef = games.find(g => g.id === gameState.gameId)!;

    if (gameState.players.find(p => p.id === playerId)) {
      return {
        success: false,
        error: `Player ${playerId} has already been created`
      };
    }

    const characterDef = characters[playerId];
    if (!characterDef) {
      return {
        success: false,
        error: `Couldn't find character for ${playerId}`
      };
    }

    const newPlayer: PlayerState = {
      id: playerId,
      name: characterDef.defaultName,
      rgbColour: characterDef.rgbColour,
      location: gameDef.locations.find(l => l.id === gameDef.startLocation)!,
      characterStats: { ...characterDef.characterStats },
      health: 0
    };

    const baseStats = getPlayerStats(newPlayer);

    const newGameState: GameState = {
      ...gameState,
      players: [...gameState.players, {
        ...newPlayer,
        baseStats: baseStats,
        health: baseStats.health - 3
      }]
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

function getPlayerStats(playerState: PlayerState): BaseStats {
  return {
    attack: playerState.characterStats.strength,
    damage: playerState.characterStats.strength,
    defence: playerState.characterStats.speed,
    magic: playerState.characterStats.magic,
    health: playerState.characterStats.resiliance,
  };
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
