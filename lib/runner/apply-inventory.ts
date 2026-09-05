import { PlayerState } from "../store/types";
import { BaseParams } from "./base-params";
import { getPlayerInventoryFromRedis, deletePlayerInventoryFromRedis } from '../store/redis-access';
import { PlayerConsumableItem, PlayerItem, PlayerItemType } from "../games/types";

export async function applyPlayerInventory(params: BaseParams, player: PlayerState): Promise<void> {
  const result = await getPlayerInventoryFromRedis(params.boardId, params.mapId, player.id);

  if (result.equipped) {
    player.equipped = {
      ...player.equipped,
      ...result.equipped
    };
  }

  if (result.equipment !== null) {
    player.equipment = result.equipment;
  }

  await deletePlayerInventoryFromRedis(params.boardId, params.mapId, player.id);
}

export const createItemForInventory = (item: PlayerItem): PlayerItem => {
  return {
    ...item,
    uniqueId: `i-${Math.ceil(Math.random() * 1000000)}`,
  };
}
