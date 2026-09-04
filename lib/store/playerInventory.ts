'use server'

import { ApiResponse } from "../api-response";
import { PlayerItemType } from "../games/types";
import { getGameStateFromRedis, getPlayerInventoryFromRedis, setPlayerInventoryInRedis } from './redis-access';
import { PlayerInventoryState } from './types';

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
      equipped: {
        ...playerInventory.equipped,
        ...playerInventory.equipped
      }
    };

    const player = gameState.players.find(p => p.id === playerId);
    if (player && updatedInventory.equipped) {
      const item = player.equipment.find(i => i.id === itemId);
      if (item) {
        switch(item.type) {
          case PlayerItemType.helmet:
            updatedInventory.equipped.helmet = item.id;
            break;
          case PlayerItemType.armour:
            updatedInventory.equipped.armour = item.id;
            break;
          case PlayerItemType.weapon:
            updatedInventory.equipped.weapon = item.id;
            break;
        }
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
