import { LocationMoveDirection } from "@/lib/games/types";
import { BaseParams } from "../base-params";
import { ProcessRunner } from "../types";
import { allItems, EquipableIds, KeyIds, ScrollIds } from "@/lib/games/items";
import { createItemForInventory } from "../apply-inventory";

export const keyProcess: ProcessRunner = {
  async setup(params: BaseParams): Promise<void> {
    // Bottom left dungeon
    setupKeyQuest(params, KeyIds.greenKey, [
      {
        location: 2,
        directions: ["e"],
        keyLocations: [37, 35],
        prizeLocations: [3],
        prizeItemIds: [EquipableIds.staffRuby, EquipableIds.bowElven, EquipableIds.swordLegendary, EquipableIds.armourChain, ScrollIds.terror]
      },
      {
        location: 44,
        directions: ["se"],
        keyLocations: [1, 3],
        prizeLocations: [35, 37],
        prizeItemIds: [EquipableIds.shieldLion, EquipableIds.necklaceRuby, EquipableIds.bootsSteel, ScrollIds.healingAura, ScrollIds.shieldWall]
      }
    ]);

    // Middle left dungeon
    setupKeyQuest(params, KeyIds.blueKey, [
      {
        location: 82,
        directions: ["w"],
        keyLocations: [73, 116, 75],
        prizeLocations: [120],
        prizeItemIds: [EquipableIds.staffCrystal, EquipableIds.crossbow, EquipableIds.necklaceGold, EquipableIds.beltRoyal, ScrollIds.fireRain]
      },
      {
        location: 85,
        directions: ["e", "s"],
        keyLocations: [120, 80],
        prizeLocations: [75, 87, 73],
        prizeItemIds: [EquipableIds.shieldKnight, EquipableIds.swordArcane, EquipableIds.armourPlate, ScrollIds.lightning, ScrollIds.strengthAura]
      }
    ]);

    // Middle right dungeon
    setupKeyQuest(params, KeyIds.purpleKey, [
      {
        location: 138,
        directions: ["w"],
        keyLocations: [101],
        prizeLocations: [136],
        prizeItemIds: [EquipableIds.staffCrystal, EquipableIds.glovesEnchanted, EquipableIds.swordInferno]
      },
      {
        location: 140,
        directions: ["s"],
        keyLocations: [136],
        prizeLocations: [101],
        prizeItemIds: [EquipableIds.axeWar, EquipableIds.warhammer, EquipableIds.warhammer, ScrollIds.fireRain]
      }
    ]);

    // Castle
    setupKeyQuest(params, KeyIds.skeletonKey, [
      {
        location: 184,
        description: 'The castle gates are locked. The heir had the Skeleton Key, but he was eaten by the Fire Dragon. Recover the key from the dragon\'s lair.',
        directions: ["n"],
        keyLocations: [202],
        prizeLocations: [226, 223, 221, 214],
        prizeItemIds: [EquipableIds.swordInferno, EquipableIds.crossbow, EquipableIds.staffCrystal, EquipableIds.armourShadow]
      }
    ]);
    
    // Volcano
    setupKeyQuest(params, KeyIds.fireKey, [
      {
        location: 239,
        description: 'The entrance to the dragon\'s lair is blocked by a stone door. Find the Fire Key.',
        directions: ["s"],
        keyLocations: [200, 156, 160, 206],
        prizeLocations: [202],
        prizeItemIds: [EquipableIds.swordInferno, EquipableIds.crossbow, EquipableIds.staffCrystal, EquipableIds.armourShadow]
      }
    ]);
  },
};

const setupKeyQuest = (
  params: BaseParams,
  keyItemType: string,
  possibleLocations: {
    location: number,
    description?: string,
    directions: LocationMoveDirection[],
    keyLocations: number[],
    prizeLocations: number[],
    prizeItemIds: string[] }[]
) => {
  const { location, description, directions, keyLocations, prizeLocations, prizeItemIds } =
    possibleLocations[Math.floor(Math.random() * possibleLocations.length)];

  const keyItem = allItems[keyItemType];

  // Lock the door(s)
  for(const direction of directions) {
    params.blockedMoves.push({
      location,
      direction,
      description: description || `There is a locked door blocking this tunnel. Find the ${keyItem.name}`,
      keyItemType
    });
  }

  const keyLocation = keyLocations[Math.floor(Math.random() * keyLocations.length)];
  // Add the key
  params.items.push({
    ...createItemForInventory(params.gameState, keyItem),
    location: keyLocation
  });

  // Pick a prize and location
  const prizeLocation = prizeLocations[Math.floor(Math.random() * prizeLocations.length)];
  const prizeItemId = prizeItemIds[Math.floor(Math.random() * prizeItemIds.length)];

  // Add the prize
  params.items.push({
    ...createItemForInventory(params.gameState, allItems[prizeItemId]),
    location: prizeLocation
  });
}