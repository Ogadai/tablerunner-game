import { GameState, INamedTarget, NOTHING_EQUPPED, PlayerInventoryEquipSlots, PlayerInventoryState, PlayerState } from "../store/types";
import { BaseParams } from "./base-params";
import { ItemDef, PlayerItem } from "../games/types";
import { getState, saveState } from './warlords-of-fire/territory-state';

export function applyCharacterInventory(player: INamedTarget, result: PlayerInventoryState): void {
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
}

export async function applyPlayerInventory(params: BaseParams, player: PlayerState, result: PlayerInventoryState): Promise<void> {
  applyCharacterInventory(player, result);

  if (result.coins !== undefined) {
    player.coins = result.coins;
  }

  if (params.gameState.gameId === 'warlordsfire' && result.teamCoinTransfer) {
    const state = getState(params.gameState);
    const teamId = player.team || player.id;
    const team = state.teams[teamId];
    if (!team || !Number.isSafeInteger(result.teamCoinTransfer) || team.coins + result.teamCoinTransfer < 0) {
      throw new Error('Invalid pending team coin transfer');
    }
    state.teams[teamId] = { ...team, coins: team.coins + result.teamCoinTransfer };
    saveState(params.gameState, state);
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
