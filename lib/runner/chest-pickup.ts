import { ApiResponse } from '../api-response';
import { GameState, AllLocationsState, PlayerState, PlayerInventoryState, getDisplayName, ItemLocationState } from '../store/types';
import { PlayerItem, ItemDef } from '../games/types';
import { getCellCoordinates } from '../games/gridCells';
import { sharedLocations } from '../games/maps/shared-locations';
import { monsters } from '../games/monsters';
import { generateMonster } from '../games/monster-pack';
import { lootItems } from '../games/items';
import { createItemForInventory } from './apply-inventory';
import { updateMonsterLeds } from './game-action-monsters';
import {
  setLocationsStateInRedis,
  setGameStateInRedis,
  getPlayerInventoryFromRedis,
  setPlayerInventoryInRedis,
} from '../store/redis-access';
import { GameTopicMessageType, LocationUpdatedMessage, MimicWarningMessage } from '../message-types';
import { publishMessage } from '../messages/message-publisher';

export async function publishMimicWarning(
  boardId: string,
  mapId: string,
  warning: Omit<MimicWarningMessage, 'type'>
): Promise<void> {
  const msg: MimicWarningMessage = {
    type: GameTopicMessageType.MimicWarning,
    ...warning,
  };
  await publishMessage(boardId, mapId, msg);
}

export async function publishLocationUpdated(boardId: string, mapId: string, locationId: number): Promise<void> {
  const msg: LocationUpdatedMessage = {
    type: GameTopicMessageType.LocationUpdated,
    locationId,
  };
  await publishMessage(boardId, mapId, msg);
}

export function isEasierLocation(locationId: number): boolean {
  const coords = getCellCoordinates(locationId);
  return coords.row >= 0 && coords.row < 6;
}

export function getAreaDifficulty(locationId: number): 'easy' | 'medium' | 'hard' {
  const coords = getCellCoordinates(locationId);
  const row = coords.row >= 0 ? coords.row : 0;
  const locDef = sharedLocations.find(l => l.id === locationId);
  const isUnderground = Boolean(locDef?.underground);

  if (row < 4 && !isUnderground) return 'easy';
  if (row < 8 && !isUnderground) return 'medium';
  if (row < 3) return 'easy';
  if (row < 6) return 'medium';
  return 'hard';
}

export function calculateMonsterCoinDropForArea(
  difficulty: 'easy' | 'medium' | 'hard',
  roll = Math.random(),
): number {
  const strength = difficulty === 'easy' ? 0.15 : difficulty === 'medium' ? 0.45 : 0.8;
  const maxCoins = Math.ceil(2 + strength * 98);
  return Math.max(2, Math.round(maxCoins * (0.3 + roll * 0.7)));
}

export function calculateChestCoins(
  difficulty: 'easy' | 'medium' | 'hard',
  options?: { coinRoll?: number; multiplierRoll?: number },
): number {
  const monsterDrop = calculateMonsterCoinDropForArea(difficulty, options?.coinRoll);
  const multiplierRoll = options?.multiplierRoll ?? Math.random();
  const multiplier = 5 + multiplierRoll * 5;
  return Math.round(monsterDrop * multiplier);
}

export function getLootItemPool(
  difficulty: 'easy' | 'medium' | 'hard',
  isHighTier: boolean,
): ItemDef[] {
  if (difficulty === 'easy') {
    if (isHighTier) {
      const pool = lootItems.filter(item => (item.value ?? 0) >= 60 && (item.value ?? 0) <= 180);
      return pool.length > 0 ? pool : lootItems;
    }
    const pool = lootItems.filter(item => (item.value ?? 0) > 0 && (item.value ?? 0) <= 50);
    return pool.length > 0 ? pool : lootItems;
  }

  if (difficulty === 'medium') {
    if (isHighTier) {
      const pool = lootItems.filter(item => (item.value ?? 0) >= 160);
      return pool.length > 0 ? pool : lootItems;
    }
    const pool = lootItems.filter(item => (item.value ?? 0) >= 25 && (item.value ?? 0) <= 150);
    return pool.length > 0 ? pool : lootItems;
  }

  if (isHighTier) {
    const pool = lootItems.filter(item => (item.value ?? 0) >= 200);
    return pool.length > 0 ? pool : lootItems;
  }
  const pool = lootItems.filter(item => (item.value ?? 0) >= 90);
  return pool.length > 0 ? pool : lootItems;
}

export function generateChestLoot(
  gameState: GameState,
  locationId: number,
  isHighTier: boolean,
  options?: {
    coinRoll?: number;
    multiplierRoll?: number;
    countRoll?: number;
    itemRolls?: number[];
  },
): { coins: number; items: ItemLocationState[] } {
  const difficulty = getAreaDifficulty(locationId);
  const chestCoins = calculateChestCoins(difficulty, {
    coinRoll: options?.coinRoll,
    multiplierRoll: options?.multiplierRoll,
  });

  const pool = getLootItemPool(difficulty, isHighTier);

  const itemCount = isHighTier
    ? 1 + Math.floor((options?.countRoll ?? Math.random()) * 2)
    : 3 + Math.floor((options?.countRoll ?? Math.random()) * 3);

  const items: ItemLocationState[] = [];
  for (let i = 0; i < itemCount; i++) {
    const itemRoll = options?.itemRolls?.[i] ?? Math.random();
    const chosenDef = pool[Math.floor(itemRoll * pool.length)] || lootItems[0];
    const newItem = createItemForInventory(gameState, chosenDef);
    items.push({
      ...newItem,
      location: locationId,
    });
  }

  return { coins: chestCoins, items };
}

export interface HandleChestPickupParams {
  boardId: string;
  mapId: string;
  playerId: string;
  chestItem: PlayerItem;
  playerState: PlayerState;
  playerInventory: PlayerInventoryState;
  gameState: GameState;
  locationsState: AllLocationsState;
  options?: {
    outcomeRoll?: number;
    highTierRoll?: number;
    coinRoll?: number;
    multiplierRoll?: number;
    countRoll?: number;
    itemRolls?: number[];
  };
}

export async function handleChestPickup({
  boardId,
  mapId,
  playerId,
  chestItem,
  playerState,
  playerInventory,
  gameState,
  locationsState,
  options,
}: HandleChestPickupParams): Promise<ApiResponse<PlayerInventoryState>> {
  // Chest is removed from location and NOT added to player inventory
  locationsState.items = locationsState.items.filter(i => i.id !== chestItem.id);

  const isLockedChest = Boolean(chestItem.key);
  const isMimic = !isLockedChest && ((options?.outcomeRoll ?? Math.random()) < 0.25);

  if (isMimic) {
    const isEasier = isEasierLocation(playerState.location.id);
    const monsterType = isEasier ? 'juvenilemimic' : 'mimic';
    const monsterDef = monsters[monsterType];

    const mimicMonster = generateMonster(gameState, {
      type: monsterType,
      location: playerState.location.id,
      health: monsterDef.baseStats.health,
      magic: monsterDef.baseStats.magic,
      team: 'monster',
    });
    locationsState.monsters.push(mimicMonster);
    updateMonsterLeds(gameState, locationsState.monsters);

    const openerName = getDisplayName(playerState);

    await setLocationsStateInRedis(boardId, mapId, locationsState);
    // Avoid full game state update; notify via MimicWarning message and trigger location update
    await setGameStateInRedis(boardId, mapId, gameState, { notify: false });
    await publishMimicWarning(boardId, mapId, {
      locationId: playerState.location.id,
      openerPlayerId: playerId,
      openerPlayerName: openerName,
      monsterName: monsterDef.name,
      monsterType,
    });
    await publishLocationUpdated(boardId, mapId, playerState.location.id);

    return {
      success: true,
      data: playerInventory,
    };
  } else {
    // 75% loot outcome (or 100% for locked chests)
    const isHighTier = isLockedChest || ((options?.highTierRoll ?? Math.random()) >= 0.5);
    const { coins: chestCoins, items: newItems } = generateChestLoot(
      gameState,
      playerState.location.id,
      isHighTier,
      options,
    );
    locationsState.items.push(...newItems);

    // Coins are added directly to all players currently at the location (each gets 100%, not shared)
    if (playerInventory.coins === undefined) {
      playerInventory.coins = playerState.coins;
    }
    playerInventory.coins += chestCoins;

    for (const player of gameState.players) {
      if (player.location.id === playerState.location.id) {
        player.coins += chestCoins;
        if (player.id !== playerId) {
          const otherInventory = await getPlayerInventoryFromRedis(boardId, mapId, player.id) || {
            equipped: null,
            equipment: null,
            hiredNpcIds: [],
          };
          if (otherInventory.coins !== undefined) {
            otherInventory.coins += chestCoins;
          } else {
            otherInventory.coins = player.coins;
          }
          await setPlayerInventoryInRedis(boardId, mapId, player.id, otherInventory);
        }
      }
    }

    await setPlayerInventoryInRedis(boardId, mapId, playerId, playerInventory);

    // Save locations and counters WITHOUT triggering full game state update
    await setLocationsStateInRedis(boardId, mapId, locationsState);
    await setGameStateInRedis(boardId, mapId, gameState, { notify: false });
    await publishLocationUpdated(boardId, mapId, playerState.location.id);

    return {
      success: true,
      data: playerInventory,
    };
  }
}
