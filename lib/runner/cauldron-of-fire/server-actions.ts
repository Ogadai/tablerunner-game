'use server'

import { ApiResponse } from '@/lib/api-response';
import { GameTopicMessageType, LocationUpdatedMessage } from '@/lib/message-types';
import { publishMessage } from '@/lib/messages/message-publisher';
import {
  getGameStateFromRedis,
  getLocationsStateFromRedis,
  getPlayerInventoryFromRedis,
  lockGameStateInRedis,
  lockLocationsStateInRedis,
  setGameStateInRedis,
  setLocationsStateInRedis,
  setPlayerInventoryInRedis,
} from '@/lib/store/redis-access';
import { GameState, PlayerInventoryState } from '@/lib/store/types';
import { activateQuest, getQuestsState, saveQuestsState, tryTurnInItemQuest } from './quests';

async function publishLocationUpdated(boardId: string, mapId: string, locationId: number): Promise<void> {
  const msg: LocationUpdatedMessage = {
    type: GameTopicMessageType.LocationUpdated,
    locationId,
  };
  await publishMessage(boardId, mapId, msg);
}

export interface CauldronQuestActionResponse {
  gameState: GameState;
  playerInventory?: PlayerInventoryState;
}

export async function acceptCauldronQuest(
  boardId: string,
  mapId: string,
  playerId: string,
  questId: string,
): Promise<ApiResponse<CauldronQuestActionResponse>> {
  let gameStateLock: (() => Promise<void>) | null = null;
  let locationsLock: (() => Promise<void>) | null = null;

  try {
    gameStateLock = await lockGameStateInRedis(boardId, mapId);
    locationsLock = await lockLocationsStateInRedis(boardId, mapId);

    const [gameState, locationsState, playerInventory] = await Promise.all([
      getGameStateFromRedis(boardId, mapId),
      getLocationsStateFromRedis(boardId, mapId),
      getPlayerInventoryFromRedis(boardId, mapId, playerId),
    ]);

    const player = gameState?.players.find(p => p.id === playerId);
    if (gameState?.gameId !== 'cauldronfire' || !player) {
      throw new Error('Quests are only available to Cauldron of Fire players');
    }

    const questsState = getQuestsState(gameState);
    const quest = questsState.quests.find(q => q.id === questId);
    if (!quest) {
      throw new Error('Quest not found');
    }

    const { updatedLocationIds } = activateQuest(
      quest,
      player,
      gameState,
      locationsState,
      playerInventory,
    );

    saveQuestsState(gameState, questsState);

    const inventoryModified = quest.category === 'deliver_item' || quest.category === 'escort_npc';
    if (inventoryModified) {
      await setPlayerInventoryInRedis(boardId, mapId, playerId, playerInventory);
    }

    await setLocationsStateInRedis(boardId, mapId, locationsState);
    await setGameStateInRedis(boardId, mapId, gameState);

    for (const locId of updatedLocationIds) {
      await publishLocationUpdated(boardId, mapId, locId);
    }

    return {
      success: true,
      data: {
        gameState,
        playerInventory: inventoryModified ? playerInventory : undefined,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  } finally {
    if (locationsLock) {
      await locationsLock();
    }
    if (gameStateLock) {
      await gameStateLock();
    }
  }
}

export async function claimCauldronQuestReward(
  boardId: string,
  mapId: string,
  playerId: string,
  questId: string,
): Promise<ApiResponse<CauldronQuestActionResponse>> {
  let gameStateLock: (() => Promise<void>) | null = null;
  let locationsLock: (() => Promise<void>) | null = null;

  try {
    gameStateLock = await lockGameStateInRedis(boardId, mapId);
    locationsLock = await lockLocationsStateInRedis(boardId, mapId);

    const [gameState, locationsState, playerInventory] = await Promise.all([
      getGameStateFromRedis(boardId, mapId),
      getLocationsStateFromRedis(boardId, mapId),
      getPlayerInventoryFromRedis(boardId, mapId, playerId),
    ]);

    const player = gameState?.players.find(p => p.id === playerId);
    if (gameState?.gameId !== 'cauldronfire' || !player) {
      throw new Error('Quests are only available to Cauldron of Fire players');
    }

    const questsState = getQuestsState(gameState);
    const quest = questsState.quests.find(q => q.id === questId);
    if (!quest) {
      throw new Error('Quest not found');
    }

    const completed = tryTurnInItemQuest(quest, player, gameState, locationsState, playerInventory);
    if (!completed) {
      throw new Error('Quest requirements are not yet met at this location');
    }

    saveQuestsState(gameState, questsState);

    await setPlayerInventoryInRedis(boardId, mapId, playerId, playerInventory);
    await setLocationsStateInRedis(boardId, mapId, locationsState);
    await setGameStateInRedis(boardId, mapId, gameState);

    return {
      success: true,
      data: {
        gameState,
        playerInventory,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  } finally {
    if (locationsLock) {
      await locationsLock();
    }
    if (gameStateLock) {
      await gameStateLock();
    }
  }
}
