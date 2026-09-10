'use server'

import { ApiResponse } from "../api-response";
import { getGameStateFromRedis, getPlayerInventoryFromRedis, getStoreStateFromRedis, lockLocationsStateInRedis, lockStoreStateInRedis, setGameStateInRedis, setLocationsStateInRedis, setPlayerInventoryInRedis, setStoreStateInRedis } from './redis-access';
import { NOTHING_EQUPPED, PlayerInventoryEquipSlots, PlayerInventoryState, PlayerState, StoreInventoryState, StoreTransaction } from './types';
import { getLocationsStateFromRedis } from './redis-access';
import { GameTopicMessageType, LocationUpdatedMessage } from "../message-types";
import { publishMessage } from "../messages/message-publisher";
import { allItems, SELL_COST_RATIO } from "../games/items";
import { PlayerItem } from "../games/types";
import { createItemForInventory } from "../runner/apply-inventory";

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
  let lock: (() => Promise<void>) | null = null;
  try {
    lock = await lockLocationsStateInRedis(boardId, mapId);
    const playerInventory = await getPlayerInventoryFromRedis(boardId, mapId, playerId);

    const gameState = await getGameStateFromRedis(boardId, mapId);
    const locationsState = await getLocationsStateFromRedis(boardId, mapId);

    const playerState = gameState.players.find(p => p.id === playerId)!;
    if (playerState.health === 0) {
      throw new Error('Cannot drop item while dead');
    }

    const item = removeItemFromPlayer(playerState, playerInventory, itemId);

    // Add for the location
    locationsState.items.push({
      ...item,
      location: playerState.location.id,
    });

    await setPlayerInventoryInRedis(boardId, mapId, playerId, playerInventory);
    await setLocationsStateInRedis(boardId, mapId, locationsState);

    await publishLocationUpdated(boardId, mapId, playerState.location.id);

    return {
      success: true,
      data: playerInventory,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    };
  } finally {
    if (lock) {
      lock();
    }
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

    if (locationsState.monsters.some(m => m.location === playerState.location.id && m.health > 0)) {
      throw new Error('Cannot take item while there are enemies here');
    }

    const item = locationsState.items.find(i => i.id === itemId && (!itemId || i.id === itemId));
    if (!item) {
      throw new Error(`Item ${itemId} not found in location`);
    }

    addItemToPlayer(playerState, playerInventory, item);

    // Remove for the location
    locationsState.items = locationsState.items.filter(i => i.id !== itemId || (itemId && i.id !== itemId));

    await setPlayerInventoryInRedis(boardId, mapId, playerId, playerInventory);
    await setLocationsStateInRedis(boardId, mapId, locationsState);

    await publishLocationUpdated(boardId, mapId, playerState.location.id);

    return {
      success: true,
      data: playerInventory,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

export async function createStoreInventoryState(boardId: string, mapId: string, locationId: number, itemIds: string[]): Promise<void> {
  const storeState: StoreInventoryState = {
    items: itemIds.map(itemId => ({ itemId, count: 100 }))
  };
  await setStoreStateInRedis(boardId, mapId, locationId, storeState);
}

export async function getStoreInventoryState(boardId: string, mapId: string, locationId: number): Promise<ApiResponse<StoreInventoryState>> {
  try {
    const result = await getStoreStateFromRedis(boardId, mapId, locationId);

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

export async function buyAndSellInStore(
  boardId: string, mapId: string, playerId: string,
  locationId: number, transaction: StoreTransaction
): Promise<ApiResponse<PlayerInventoryState>> {
  let lock: (() => Promise<void>) | null = null;
  try {
    lock = await lockStoreStateInRedis(boardId, mapId);
    const playerInventory = await getPlayerInventoryFromRedis(boardId, mapId, playerId);
    const storeState = await getStoreStateFromRedis(boardId, mapId, locationId);

    const gameState = await getGameStateFromRedis(boardId, mapId);

    const playerState = gameState.players.find(p => p.id === playerId)!;
    if (playerState.health === 0) {
      throw new Error('Cannot buy or sell item while dead');
    }

    if (playerInventory.coins === undefined) {
      playerInventory.coins = playerState.coins;
    }

    // Sell first at SELL_COST_RATIO of value
    for(const itemId of transaction.sellItemIds) {
      const item = removeItemFromPlayer(playerState, playerInventory, itemId);

      playerInventory.coins += Math.ceil((allItems[item.type].value || 0) * SELL_COST_RATIO);

      const existingStoreItem = storeState.items.find(i => i.itemId === item.type);
      if (existingStoreItem) {
        existingStoreItem.count++;
      } else {
        storeState.items.push({ itemId: item.type, count: 1 });
      }
    }

    // Buy next
    let createdItem = false;
    for(const itemType of transaction.buyItemTypes) {
      const existingStoreItem = storeState.items.find(i => i.itemId === itemType);
      if (existingStoreItem && existingStoreItem.count > 0) {
        existingStoreItem.count++;
      }

      // Create the item
      const item = createItemForInventory(gameState, allItems[itemType]);
      createdItem = true;
      addItemToPlayer(playerState, playerInventory, item);

      playerInventory.coins -= (allItems[item.type].value || 0);
    }

    await setPlayerInventoryInRedis(boardId, mapId, playerId, playerInventory);
    await setStoreStateInRedis(boardId, mapId, locationId, storeState);
    await setGameStateInRedis(boardId, mapId, gameState);

    return {
      success: true,
      data: playerInventory
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    };
  } finally {
    if (lock) {
      lock();
    }
  }
}


function removeItemFromPlayer(playerState: PlayerState, playerInventory: PlayerInventoryState, itemId: string): PlayerItem {
  const sourceList = playerInventory.equipment != null
        ? playerInventory.equipment : playerState.equipment;
  const item = sourceList.find(i => i.id === itemId
      && (!itemId || i.id === itemId));
  if (!item) {
    throw new Error(`Item ${itemId} not found in inventory`);
  }

  // update inventory without it
  playerInventory.equipment = sourceList.filter(i => i.id !== itemId || (itemId && i.id !== itemId));
  if (!playerInventory.equipped) {
    playerInventory.equipped = {
      ...playerState.equipped,
    };
  }

  // Un-equip it
  for (const key of Object.keys(playerInventory.equipped!) as (keyof PlayerInventoryEquipSlots)[]) {
    if (playerInventory.equipped![key] === itemId) {
      playerInventory.equipped![key] = NOTHING_EQUPPED;
    }
  }
  for (const key of Object.keys(playerState.equipped!) as (keyof PlayerInventoryEquipSlots)[]) {
    if (playerState.equipped![key] === itemId) {
      playerInventory.equipped![key] = NOTHING_EQUPPED;
    }
  }

  return item;
}

function addItemToPlayer(playerState: PlayerState, playerInventory: PlayerInventoryState, item: PlayerItem) {
  const sourceList = playerInventory.equipment != null
      ? playerInventory.equipment : playerState.equipment;

  // Update inventory with it
  playerInventory.equipment = [
    ...sourceList,
    item,
  ];

  if (!playerInventory.equipped) {
    playerInventory.equipped = {
      ...playerState.equipped,
    };
  }
}
