import { GameState, NOTHING_EQUPPED, PlayerState } from "../store/types";
import { BaseParams } from "./base-params";
import { getPlayerInventoryFromRedis, deletePlayerInventoryFromRedis } from '../store/redis-access';
import { ItemDef, PlayerItem } from "../games/types";

export async function applyPlayerInventory(params: BaseParams, player: PlayerState): Promise<void> {
  const result = await getPlayerInventoryFromRedis(params.boardId, params.mapId, player.id);

  if (result.equipped) {
    for(const key of Object.keys(result.equipped)) {
      if ((result.equipped as any)[key] === NOTHING_EQUPPED) {
        delete (player.equipped as any)[key];
      } else {
        (player.equipped as any)[key] = (result.equipped as any)[key];
      }
    }
  }

  if (result.equipment !== null) {
    player.equipment = result.equipment;
  }

  if (result.coins !== undefined) {
    player.coins = result.coins;
  }

  await deletePlayerInventoryFromRedis(params.boardId, params.mapId, player.id);
}

// TODO: Use a better id allocation system
export const createItemForInventory = (gameState: GameState, item: ItemDef): PlayerItem => {
  const nextId = ++gameState.counters.itemId;
  
  return {
    type: item.id,
    id: `i-${nextId}`,
  };
}
