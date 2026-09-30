import { BaseParams } from "../base-params";
import { ProcessRunner } from "../types";
import { SpecialIds } from "@/lib/games/items";
import { createItemForInventory } from "../apply-inventory";

export const setupProcess: ProcessRunner = {
  async setup(params: BaseParams): Promise<void> {
    // Make portals "visited"
    params.gameState.visited = [
      ...params.gameState.portals
    ];
    params.gameState.visitedPortals = [
      ...params.gameState.portals
    ];

    // Add the shards

  }
}
