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

  await deletePlayerInventoryFromRedis(params.boardId, params.mapId, player.id);
}

export const createItemForInventory = (item: PlayerItem): PlayerItem => {
  const newItem = { ...item };
  if (newItem.type === PlayerItemType.consumable) {
    (newItem as PlayerConsumableItem).uniqueId = `i-${Math.ceil(Math.random() * 1000000)}`;
  }
  return newItem;
}