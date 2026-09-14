import { EquipableIds } from "@/lib/games/items";
import { BaseParams } from "../base-params";
import { ProcessRunner } from "../types";

export const npcs: ProcessRunner = {
  async setup(params: BaseParams): Promise<void> {
    params.gameState.npcs.push({
      id: 'db-1',
      name: 'Dingle Berry',
      location: { id: 10, description: '', move: [] },
      magic: 10,
      spells: [],
      equipment: [{
        id: 'db-s1',
        type: EquipableIds.swordSteel,
      }],
      equipped: {
        weapon: 'db-s1',
      },
      baseStats: {
        attack: 20,
        damage: 15,
        defence: 20,
        magic: 2,
        health: 20,
        speed: 8,
      },
      masterId: null,
      hireCost: 30,
      iconType: 'character',
      iconXY: { x: 1, y: 1 },
      health: 20,
    });
  }
}
