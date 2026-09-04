import { PlayerState } from "../store/types";
import { BaseParams } from "./base-params";
import { getPlayerInventoryFromRedis, deletePlayerInventoryFromRedis } from '../store/redis-access';

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
