'use server'

import { ApiResponse } from '@/lib/api-response';
import { GameTopicMessageType, LocationUpdatedMessage, QuestsUpdatedMessage } from '@/lib/message-types';
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
import { GameState, LedState, NPCState, PlayerInventoryState } from '@/lib/store/types';
import { QuestInstance } from './quest-types';
import { activateQuest, getQuestsState, saveQuestsState, tryTurnInItemQuest, updateQuestLeds } from './quests';

async function publishLocationUpdated(boardId: string, mapId: string, locationId: number): Promise<void> {
  const msg: LocationUpdatedMessage = {
    type: GameTopicMessageType.LocationUpdated,
    locationId,
  };
  await publishMessage(boardId, mapId, msg);
}

async function publishQuestsUpdated(
  boardId: string,
  mapId: string,
  quests: QuestInstance[],
  npcs: NPCState[],
  leds?: LedState[],
): Promise<void> {
  const msg: QuestsUpdatedMessage = {
    type: GameTopicMessageType.QuestsUpdated,
    quests,
    npcs,
    leds,
  };
  await publishMessage(boardId, mapId, msg);
}

export interface CauldronQuestActionResponse {
  gameState: GameState;
  quests: QuestInstance[];
  npcs: NPCState[];
  playerInventory?: PlayerInventoryState;
  leds?: LedState[];
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
    updateQuestLeds(gameState, questsState.quests);

    const inventoryModified = quest.category === 'deliver_item' || quest.category === 'escort_npc';
    if (inventoryModified) {
      await setPlayerInventoryInRedis(boardId, mapId, playerId, playerInventory);
    }

    await setLocationsStateInRedis(boardId, mapId, locationsState);
    // Do not broadcast GameStateUpdated on quest accept so clients don't re-render the whole page or re-pop turn messages.
    await setGameStateInRedis(boardId, mapId, gameState, { notify: false });
    await publishQuestsUpdated(boardId, mapId, questsState.quests, gameState.npcs, gameState.leds);

    for (const locId of updatedLocationIds) {
      await publishLocationUpdated(boardId, mapId, locId);
    }

    return {
      success: true,
      data: {
        gameState,
        quests: questsState.quests,
        npcs: gameState.npcs,
        playerInventory: inventoryModified ? playerInventory : undefined,
        leds: gameState.leds,
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
    updateQuestLeds(gameState, questsState.quests);

    await setPlayerInventoryInRedis(boardId, mapId, playerId, playerInventory);
    await setLocationsStateInRedis(boardId, mapId, locationsState);
    await setGameStateInRedis(boardId, mapId, gameState, { notify: false });
    await publishQuestsUpdated(boardId, mapId, questsState.quests, gameState.npcs, gameState.leds);

    return {
      success: true,
      data: {
        gameState,
        quests: questsState.quests,
        npcs: gameState.npcs,
        playerInventory,
        leds: gameState.leds,
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
