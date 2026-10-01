'use server'

import { ApiResponse } from "../api-response";
import { getGameStateFromRedis, getPlayerInventoryFromRedis, getStoreStateFromRedis, lockGameStateInRedis, lockLocationsStateInRedis, lockStoreStateInRedis, setGameStateInRedis, setLocationsStateInRedis, setPlayerInventoryInRedis, setStoreStateInRedis } from './redis-access';
import { INamedTarget, NOTHING_EQUPPED, NpcInventoryTransfer, PlayerActionType, PlayerInventoryEquipSlots, PlayerInventoryState, StoreInventoryState, StoreTransaction } from './types';
import { getActionsStateFromRedis, getCharacterInventoriesFromRedis, getLocationsStateFromRedis, setCharacterInventoriesInRedis } from './redis-access';
import { GameTopicMessageType, LocationUpdatedMessage, StoreUpdatedMessage } from "../message-types";
import { publishMessage } from "../messages/message-publisher";
import { allItems, SELL_COST_RATIO } from "../games/items";
import { PlayerItem } from "../games/types";
import { createItemForInventory } from "../runner/apply-inventory";
import { getEnemies } from '../runner/game-friends-or-enemies';
import { equipBestNpcItems } from './npcInventory';

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

export async function hireNpc(
  boardId: string, mapId: string, playerId: string, npcId: string
): Promise<ApiResponse<PlayerInventoryState>> {
  let gameStateLock: (() => Promise<void>) | null = null;
  let lock: (() => Promise<void>) | null = null;
  try {
    gameStateLock = await lockGameStateInRedis(boardId, mapId);
    lock = await lockLocationsStateInRedis(boardId, mapId);

    const playerInventory = await getPlayerInventoryFromRedis(boardId, mapId, playerId);
    const gameState = await getGameStateFromRedis(boardId, mapId);
    const locationsState = await getLocationsStateFromRedis(boardId, mapId);
    const player = gameState.players.find(p => p.id === playerId);
    locationsState.npcs = locationsState.npcs || [];
    const npc = locationsState.npcs.find(n => n.id === npcId);

    if (!player || !npc || npc.location.id !== player.location.id) {
      throw new Error('NPC is not available at this location');
    }
    if (player.health === 0) {
      throw new Error('Cannot hire an NPC while dead');
    }
    if (npc.health === 0) {
      throw new Error('Cannot hire a dead NPC');
    }
    if (npc.masterId !== null) {
      throw new Error('NPC has already been hired');
    }

    if (playerInventory.coins === undefined) {
      playerInventory.coins = player.coins;
    }
    if (playerInventory.coins < npc.hireCost) {
      throw new Error('Not enough coins to hire this NPC');
    }

    playerInventory.coins -= npc.hireCost;
    playerInventory.hiredNpcIds = [...(playerInventory.hiredNpcIds || []), npc.id];
    npc.masterId = playerId;
    npc.team = player.team;

    await setPlayerInventoryInRedis(boardId, mapId, playerId, playerInventory);
    await setLocationsStateInRedis(boardId, mapId, locationsState);
    await publishLocationUpdated(boardId, mapId, player.location.id);

    return { success: true, data: playerInventory };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  } finally {
    if (lock) {
      await lock();
    }
    if (gameStateLock) {
      await gameStateLock();
    }
  }
}

export async function playerEquipItem(boardId: string, mapId: string, playerId: string, itemId: string): Promise<ApiResponse<PlayerInventoryState>> {
  let gameStateLock: (() => Promise<void>) | null = null;
  try {
    gameStateLock = await lockGameStateInRedis(boardId, mapId);
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
        updatedInventory.equipped![allItems[item.type].type as keyof PlayerInventoryEquipSlots] = item.id;
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
  } finally {
    if (gameStateLock) {
      await gameStateLock();
    }
  }
}

export async function giveItemToNpc(
  boardId: string, mapId: string, playerId: string, npcId: string, itemId: string,
): Promise<ApiResponse<NpcInventoryTransfer>> {
  return transferNpcItem(boardId, mapId, playerId, npcId, itemId, 'give');
}

export async function takeItemFromNpc(
  boardId: string, mapId: string, playerId: string, npcId: string, itemId: string,
): Promise<ApiResponse<NpcInventoryTransfer>> {
  return transferNpcItem(boardId, mapId, playerId, npcId, itemId, 'take');
}

async function transferNpcItem(
  boardId: string, mapId: string, playerId: string, npcId: string, itemId: string, direction: 'give' | 'take',
): Promise<ApiResponse<NpcInventoryTransfer>> {
  let gameStateLock: (() => Promise<void>) | null = null;
  let locationsLock: (() => Promise<void>) | null = null;
  try {
    gameStateLock = await lockGameStateInRedis(boardId, mapId);
    locationsLock = await lockLocationsStateInRedis(boardId, mapId);
    const gameState = await getGameStateFromRedis(boardId, mapId);
    const locationsState = await getLocationsStateFromRedis(boardId, mapId);
    const player = gameState?.players.find(p => p.id === playerId);
    const npc = locationsState.npcs.find(n => n.id === npcId);

    if (!player || !npc || playerId === npcId || npc.location.id !== player.location.id) {
      throw new Error('NPC is not available at this location');
    }
    if (player.health <= 0) {
      throw new Error('Cannot transfer items while dead');
    }
    if (npc.masterId !== playerId) {
      throw new Error('Cannot transfer items with another player\'s NPC');
    }
    if (direction === 'give' && npc.health <= 0) {
      throw new Error('Cannot give items to a dead NPC');
    }

    if (direction === 'give') {
      const actions = await getActionsStateFromRedis(boardId, mapId, playerId);
      if (actions.actions.some(action =>
        (action.type === PlayerActionType.UseItem || action.type === PlayerActionType.ReadScroll)
        && 'itemId' in action && action.itemId === itemId)) {
        throw new Error('Cannot give an item queued for use this turn');
      }
    }

    const inventories = await getCharacterInventoriesFromRedis(boardId, mapId, [playerId, npcId]);
    const playerInventory = inventories[playerId];
    const npcInventory = inventories[npcId];
    if (direction === 'give') {
      const item = removeItemFromPlayer(player, playerInventory, itemId);
      addItemToPlayer(npc, npcInventory, item);
    } else {
      const item = removeItemFromPlayer(npc, npcInventory, itemId);
      addItemToPlayer(player, playerInventory, item);
    }
    equipBestNpcItems(npcInventory);

    // Commit both sides together while excluding other inventory writes and turn processing.
    await setCharacterInventoriesInRedis(boardId, mapId, inventories);
    return { success: true, data: { playerInventory, npcInventory } };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  } finally {
    if (locationsLock) await locationsLock();
    if (gameStateLock) await gameStateLock();
  }
}

export async function dropItemAtLocation(boardId: string, mapId: string, playerId: string, itemId: string): Promise<ApiResponse<PlayerInventoryState>> {
  let gameStateLock: (() => Promise<void>) | null = null;
  let lock: (() => Promise<void>) | null = null;
  try {
    gameStateLock = await lockGameStateInRedis(boardId, mapId);
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
      await lock();
    }
    if (gameStateLock) {
      await gameStateLock();
    }
  }
}

export async function takeItemAtLocation(boardId: string, mapId: string, playerId: string, itemId: string): Promise<ApiResponse<PlayerInventoryState>> {
  let gameStateLock: (() => Promise<void>) | null = null;
  try {
    gameStateLock = await lockGameStateInRedis(boardId, mapId);
    const playerInventory = await getPlayerInventoryFromRedis(boardId, mapId, playerId);

    const gameState = await getGameStateFromRedis(boardId, mapId);
    const locationsState = await getLocationsStateFromRedis(boardId, mapId);

    const playerState = gameState.players.find(p => p.id === playerId)!;
    if (playerState.health === 0) {
      throw new Error('Cannot take item while dead');
    }

    if (getEnemies({ gameState: { ...gameState, npcs: locationsState.npcs ?? gameState.npcs }, monsters: locationsState.monsters }, playerState).some(target => target.health > 0)) {
      throw new Error('Cannot take item while there are enemies here');
    }

    const item = locationsState.items.find(i => i.id === itemId && i.location === playerState.location.id);
    if (!item) {
      throw new Error(`Item ${itemId} not found in location`);
    }

    addItemToPlayer(playerState, playerInventory, item);

    // Remove for the location
    locationsState.items = locationsState.items.filter(i => i !== item);

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
    if (gameStateLock) {
      await gameStateLock();
    }
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
  let gameStateLock: (() => Promise<void>) | null = null;
  let storeLock: (() => Promise<void>) | null = null;
  try {
    gameStateLock = await lockGameStateInRedis(boardId, mapId);
    storeLock = await lockStoreStateInRedis(boardId, mapId);
    const playerInventory = await getPlayerInventoryFromRedis(boardId, mapId, playerId);
    const storeState = await getStoreStateFromRedis(boardId, mapId, locationId);

    const gameState = await getGameStateFromRedis(boardId, mapId);

    const playerState = gameState.players.find(p => p.id === playerId)!;
    if (playerState.health === 0) {
      throw new Error('Cannot buy or sell item while dead');
    }

    if (playerState.location.id !== locationId) {
      throw new Error('Cannot buy or sell items at another location');
    }
    if (!gameState.stores.includes(locationId)) {
      throw new Error('Store is not available at this location');
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
    for(const itemType of transaction.buyItemTypes) {
      const existingStoreItem = storeState.items.find(i => i.itemId === itemType);
      if (!existingStoreItem || existingStoreItem.count <= 0) {
        throw new Error(`Item ${itemType} is out of stock`);
      }

      const itemValue = allItems[itemType].value || 0;
      if (playerInventory.coins < itemValue) {
        throw new Error(`Not enough coins to buy item ${itemType}`);
      }

      existingStoreItem.count--;

      // Create the item
      const item = createItemForInventory(gameState, allItems[itemType]);
      addItemToPlayer(playerState, playerInventory, item);

      playerInventory.coins -= itemValue;
    }

    await setPlayerInventoryInRedis(boardId, mapId, playerId, playerInventory);
    await setStoreStateInRedis(boardId, mapId, locationId, storeState);
    if (transaction.buyItemTypes.length > 0) {
      // Only the item-ID counter changed; clients do not need a game refresh.
      await setGameStateInRedis(boardId, mapId, gameState, { notify: false });
    }

    const message: StoreUpdatedMessage = {
      type: GameTopicMessageType.StoreUpdated,
      locationId,
      playerId,
      playerInventory,
      storeInventory: storeState,
    };
    await publishMessage(boardId, mapId, message);

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
    if (storeLock) {
      await storeLock();
    }
    if (gameStateLock) {
      await gameStateLock();
    }
  }
}


function removeItemFromPlayer(playerState: INamedTarget, playerInventory: PlayerInventoryState, itemId: string): PlayerItem {
  const sourceList = playerInventory.equipment != null
        ? playerInventory.equipment : playerState.equipment;
  const item = sourceList.find(i => i.id === itemId
      && (!itemId || i.id === itemId));
  if (!item) {
    throw new Error(`Item ${itemId} not found in inventory`);
  }

  // update inventory without it
  playerInventory.equipment = sourceList.filter(i => i.id !== itemId || (itemId && i.id !== itemId));
  // Pending selections override persisted equipment for each slot.
  playerInventory.equipped = {
    ...playerState.equipped,
    ...playerInventory.equipped,
  };

  // Un-equip it only if it is still selected.
  for (const key of Object.keys(playerInventory.equipped) as (keyof PlayerInventoryEquipSlots)[]) {
    if (playerInventory.equipped[key] === itemId) {
      playerInventory.equipped[key] = NOTHING_EQUPPED;
    }
  }

  return item;
}

function addItemToPlayer(playerState: INamedTarget, playerInventory: PlayerInventoryState, item: PlayerItem) {
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
