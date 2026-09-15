import { ConsumableIds, EquipableIds } from "@/lib/games/items";
import { BaseParams } from "../base-params";
import { ProcessRunner } from "../types";

export const npcs: ProcessRunner = {
  async setup(params: BaseParams): Promise<void> {
    params.gameState.npcs.push({
      id: 'db-1',
      masterId: 'witch',
      name: 'Dingle Berry',
      location: { id: 10, description: '', move: [] },
      magic: 10,
      spells: [],
      equipment: [{
        id: 'db-s1',
        type: EquipableIds.swordSteel,
      }, {
        id: 'db-h1',
        type: ConsumableIds.healingPotion,
      }, {
        id: 'db-h2',
        type: ConsumableIds.greaterHealingPotion,
      }],
      equipped: {
        weapon: 'db-s1',
      },
      baseStats: {
        attack: 12,
        damage: 8,
        defence: 10,
        magic: 2,
        health: 15,
        speed: 8,
      },
      hireCost: 30,
      iconType: 'character',
      iconXY: { x: 0, y: 3 },
      health: 15,
    });
  }
}
