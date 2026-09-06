'use server'

import { ApiResponse } from "../api-response";
import { getGameStateFromRedis, getPlayerInventoryFromRedis, setLocationsStateInRedis, setPlayerInventoryInRedis } from './redis-access';
import { NOTHING_EQUPPED, PlayerInventoryEquipSlots, PlayerInventoryState } from './types';
import { getLocationsStateFromRedis } from './redis-access';
import { GameTopicMessageType, LocationUpdatedMessage } from "../message-types";
import { publishMessage } from "../messages/message-publisher";
import { allItems } from "../games/items";

async function publishLocationUpdated(boardId: string, mapId: string, locationId: number): Promise<void> {
  const msg: LocationUpdatedMessage = {
    type: GameTopicMessageType.LocationUpdated,
    locationId
  };
  await publishMessage(boardId, mapId, msg);
}

export async function getPlayerInventory(boardId: string, mapId: string, playerId: string): Promise<ApiResponse<PlayerInventoryState>> {
  try {
    const result = await getPlayerInventoryFromRedis(boardId, mapId, playerId);

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

export async function playerEquipItem(boardId: string, mapId: string, playerId: string, itemId: string): Promise<ApiResponse<PlayerInventoryState>> {
  try {
    const gameState = await getGameStateFromRedis(boardId, mapId);
    const playerInventory = await getPlayerInventoryFromRedis(boardId, mapId, playerId);

    const updatedInventory: PlayerInventoryState = {
      ...playerInventory,
      equipped: {
        ...playerInventory.equipped,
      }
    };

    const player = gameState.players.find(p => p.id === playerId);

    if (player && updatedInventory.equipped) {
      const sourceList = playerInventory.equipment != null
          ? playerInventory.equipment : player.equipment;

      const item = sourceList.find(i => i.id === itemId);
      if (item) {
        (updatedInventory.equipped as any)[allItems[item.type].type] = item.id;
      }
    }

    await setPlayerInventoryInRedis(boardId, mapId, playerId, updatedInventory);

    return {
      success: true,
      data: updatedInventory
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

export async function dropItemAtLocation(boardId: string, mapId: string, playerId: string, itemId: string): Promise<ApiResponse<PlayerInventoryState>> {
  try {
    const playerInventory = await getPlayerInventoryFromRedis(boardId, mapId, playerId);

    const gameState = await getGameStateFromRedis(boardId, mapId);
    const locationsState = await getLocationsStateFromRedis(boardId, mapId);

    const playerState = gameState.players.find(p => p.id === playerId)!;
    if (playerState.health === 0) {
      throw new Error('Cannot drop item while dead');
    }

    const sourceList = playerInventory.equipment != null
        ? playerInventory.equipment : playerState.equipment;
    const item = sourceList.find(i => i.id === itemId
        && (!itemId || i.id === itemId));
    if (!item) {
      throw new Error(`Item ${itemId} not found in inventory`);
    }

    // Store the updated inventory without it
    const updatedInventory: PlayerInventoryState = {
      equipped: {
        ...playerInventory.equipped,
      },
      equipment: sourceList.filter(i => i.id !== itemId || (itemId && i.id !== itemId)),
    };

    // Un-equip it
    for (const key of Object.keys(updatedInventory.equipped!) as (keyof PlayerInventoryEquipSlots)[]) {
        if (updatedInventory.equipped![key] === itemId) {
          updatedInventory.equipped![key] = NOTHING_EQUPPED;
        }
    }
    for (const key of Object.keys(playerState.equipped!) as (keyof PlayerInventoryEquipSlots)[]) {
        if (playerState.equipped![key] === itemId) {
          updatedInventory.equipped![key] = NOTHING_EQUPPED;
        }
    }

    // Add for the location
    locationsState.items.push({
      ...item,
      location: playerState.location.id,
    });

    await setPlayerInventoryInRedis(boardId, mapId, playerId, updatedInventory);
    await setLocationsStateInRedis(boardId, mapId, locationsState);

    await publishLocationUpdated(boardId, mapId, playerState.location.id);

    return {
      success: true,
      data: updatedInventory,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

export async function takeItemAtLocation(boardId: string, mapId: string, playerId: string, itemId: string): Promise<ApiResponse<PlayerInventoryState>> {
  try {
    const playerInventory = await getPlayerInventoryFromRedis(boardId, mapId, playerId);

    const gameState = await getGameStateFromRedis(boardId, mapId);
    const locationsState = await getLocationsStateFromRedis(boardId, mapId);

    const playerState = gameState.players.find(p => p.id === playerId)!;
    if (playerState.health === 0) {
      throw new Error('Cannot take item while dead');
    }

    if (locationsState.monsters.some(m => m.location === playerState.location.id)) {
      throw new Error('Cannot take item while there are enemies here');
    }

    const sourceList = playerInventory.equipment != null
        ? playerInventory.equipment : playerState.equipment;

    const item = locationsState.items.find(i => i.id === itemId && (!itemId || i.id === itemId));
    if (!item) {
      throw new Error(`Item ${itemId} not found in location`);
    }

    // Store the updated inventory with it
    const updatedInventory: PlayerInventoryState = {
      equipped: {
        ...playerInventory.equipped,
      },
      equipment: [
        ...sourceList,
        item,
      ],
    };

    // Remove for the location
    locationsState.items = locationsState.items.filter(i => i.id !== itemId || (itemId && i.id !== itemId));

    await setPlayerInventoryInRedis(boardId, mapId, playerId, updatedInventory);
    await setLocationsStateInRedis(boardId, mapId, locationsState);

    await publishLocationUpdated(boardId, mapId, playerState.location.id);

    return {
      success: true,
      data: updatedInventory,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    };
  }
}
