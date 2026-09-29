import { GameState, NOTHING_EQUPPED, PlayerInventoryEquipSlots, PlayerInventoryState, PlayerState } from "../store/types";
import { BaseParams } from "./base-params";
import { ItemDef, PlayerItem } from "../games/types";

export async function applyPlayerInventory(params: BaseParams, player: PlayerState, result: PlayerInventoryState): Promise<void> {
  if (result.equipped) {
    for(const key of Object.keys(result.equipped) as (keyof PlayerInventoryEquipSlots)[]) {
      if (result.equipped[key] === NOTHING_EQUPPED) {
        delete player.equipped[key];
      } else {
        player.equipped[key] = result.equipped[key];
      }
    }
  }

  if (result.equipment !== null) {
    player.equipment = result.equipment;
  }

  if (result.coins !== undefined) {
    player.coins = result.coins;
  }

  for (const npcId of result.hiredNpcIds || []) {
    const npc = params.gameState.npcs.find(n => n.id === npcId);
    if (npc) {
      npc.masterId = player.id;
      npc.team = player.team;
    }
  }

  // Pending changes are consumed atomically when the completed turn is saved.
}

// TODO: Use a better id allocation system
export const createItemForInventory = (gameState: GameState, item: ItemDef): PlayerItem => {
  const nextId = ++gameState.counters.itemId;
  
  return {
    type: item.id,
    id: `i-${nextId}`,
  };
}
