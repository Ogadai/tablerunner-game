import { PlayerState, PlayerActionUseItem, CharacterEffect } from "../store/types";
import { ConsumableItemDef } from '@/lib/games/types';
import { BaseParams } from './base-params';
import { soloMessageAtLocation } from './game-messages';
import { allItems } from "../games/items";
import { specialItemActions } from './special-item-actions';

export function actionUseItem(params: BaseParams, player: PlayerState, action: PlayerActionUseItem): void {
  const item = player.equipment.find(item => item.id === action.itemId);
  const usableItem = item && allItems[item.type] as ConsumableItemDef;

  if (usableItem) {
    const benefitDescriptions: string[] = [];
    // Apply benefit
    if (usableItem.bonusStats?.health) {
      const addedHealth = Math.min(usableItem.bonusStats?.health,
        player.baseStats!.health - player.health);
      player.health += addedHealth;

      benefitDescriptions.push(`**${addedHealth}** health`);
    }
    if (usableItem.bonusStats?.magic) {
      const addedmagic = Math.min(usableItem.bonusStats?.magic,
        player.baseStats!.magic - player.magic);
      player.magic += addedmagic;

      benefitDescriptions.push(`**${addedmagic}** magic`);
    }

    if (benefitDescriptions.length > 0) {
      soloMessageAtLocation(params, player.id,
        `**You** drank **${usableItem.name}** for ${benefitDescriptions.join(' and ')}!`);
    }
    
    let shouldRemoveItem = true;
    if (specialItemActions[usableItem.id]) {
      shouldRemoveItem = specialItemActions[usableItem.id](params, player);
    } else if (usableItem.bonusStats && usableItem.turns != undefined && usableItem.turns > 0) {
      const { health, magic, special, ...effectBonuses } = usableItem.bonusStats;
      const newEffect: CharacterEffect = {
        description: usableItem.name,
        turns: usableItem.turns + 1,
        ...effectBonuses
      };

      if (!player.effects) {
        player.effects = [];
      }
      player.effects.push(newEffect);
    }

    // Remove from equipment
    if (shouldRemoveItem) {
      player.equipment = player.equipment.filter(item => item.id !== action.itemId)
    }
  }
}
