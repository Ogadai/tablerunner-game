import { BaseParams } from "../base-params";
import { ProcessRunner } from "../types";
import { allItems, SpecialIds } from "@/lib/games/items";
import { createItemForInventory } from "../apply-inventory";
import { soloMessageAtLocation } from "../game-messages";

const shardLocations: number[] = [
  1, 3, 38, 44, 35, 7, 50, 13, 16, 67, 20, 60, 61,
  120, 116, 87, 76, 73, 113, 111, 109, 106, 146, 136, 101, 97, 100, 152, 230, 212,
  160, 156, 162, 240, 202, 192, 227, 221, 220, 214
];

const SHARD_COUNT = 10;

export const shardProcess: ProcessRunner = {
  async setup(params: BaseParams): Promise<void> {
    // Make portals "visited"
    params.gameState.visited = [
      ...params.gameState.portals
    ];
    params.gameState.visitedPortals = [
      ...params.gameState.portals
    ];

    const shardItem = allItems[SpecialIds.fireCrystalShard];

    // Add the shards
    const availableLocations = [...shardLocations];
    for(let n = 0; n < SHARD_COUNT; n++) {
      const index = Math.floor(Math.random() * availableLocations.length);
      const location = availableLocations.splice(index, 1)[0];

      // Add the shard
      params.items.push({
        ...createItemForInventory(params.gameState, shardItem),
        location
      });
    }
  },

  async executeForTurn(params: BaseParams): Promise<void> {
    // Any found sharts (defeated monsters) should be split between players
    const locations = new Set<number>(params.gameState.players.map(p => p.location.id));
    const shardItem = allItems[SpecialIds.fireCrystalShard];

    for(const location of locations.values()) {
      const shards = params.items.filter(i => i.location === location && i.type === SpecialIds.fireCrystalShard);
      if (shards.length > 0) {
        const players = params.gameState.players.filter(p => p.location.id === location);

        // Each player gets a shard
        for(const player of players) {
          player.equipment.push(createItemForInventory(params.gameState, shardItem));
          soloMessageAtLocation(params, player.id, '**{player}** found a **Fire Crystal Shard**');
        }

        params.items = params.items.filter(i => i.location !== location || i.type !== SpecialIds.fireCrystalShard);
      }
    }
  }
}
