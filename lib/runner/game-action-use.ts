import { PlayerActionUseItem, CharacterEffect, INamedTarget } from "../store/types";
import { ConsumableItemDef } from '@/lib/games/types';
import { BaseParams } from './base-params';
import { playerMessageAtLocation } from './game-messages';
import { allItems } from "../games/items";
import { specialItemActions } from './special-item-actions';
import { getCombatStats } from "../store/playerStats";
import { recordCombatItem } from './combat-log';

export function actionUseItem(params: BaseParams, player: INamedTarget, action: PlayerActionUseItem): void {
  const item = player.equipment.find(item => item.id === action.itemId);
  const usableItem = item && allItems[item.type] as ConsumableItemDef;

  if (usableItem) {
    const characterStats = getCombatStats(player);
    const healthBefore = player.health;

    const benefitDescriptions: string[] = [];
    // Apply benefit
    if (usableItem.bonusStats?.health) {
      const addedHealth = Math.min(usableItem.bonusStats?.health,
        characterStats.health - player.health);
      player.health += addedHealth;

      benefitDescriptions.push(`**${addedHealth}** health`);
    }
    if (usableItem.bonusStats?.magic) {
      const addedmagic = Math.min(usableItem.bonusStats?.magic,
        characterStats.magic - player.magic);
      player.magic += addedmagic;

      benefitDescriptions.push(`**${addedmagic}** magic`);
    }

    if (benefitDescriptions.length > 0) {
      playerMessageAtLocation(params, player.id,
        `**{player}** drank **${usableItem.name}** for ${benefitDescriptions.join(' and ')}!`);
    }

    let shouldRemoveItem = true;
    if (specialItemActions[usableItem.id]) {
      const candidates = [
        ...params.gameState.players.filter(p => p.location.id === player.location.id),
        ...params.gameState.npcs.filter(n => n.location.id === player.location.id),
      ];
      const healthBeforeMap = new Map(candidates.map(c => [c.id, c.health]));

      shouldRemoveItem = specialItemActions[usableItem.id](params, player);

      if (shouldRemoveItem) {
        const affectedTargets = candidates
          .filter(c => c.health !== healthBeforeMap.get(c.id))
          .map(c => ({
            target: c,
            healthDelta: c.health - (healthBeforeMap.get(c.id) ?? c.health),
            resultHealth: c.health,
          }));

        if (affectedTargets.length > 0) {
          recordCombatItem(params, player.location.id, player, usableItem, affectedTargets);
        }
      }
    } else {
      recordCombatItem(
        params,
        player.location.id,
        player,
        usableItem,
        [{
          target: player,
          healthDelta: player.health - healthBefore,
          resultHealth: player.health,
        }]
      );

      if (usableItem.bonusStats && usableItem.turns != undefined && usableItem.turns > 0) {
        const { attack, damage, defence, speed } = usableItem.bonusStats;
        const newEffect: CharacterEffect = {
          description: usableItem.name,
          turns: usableItem.turns + 1,
          attack, damage, defence, speed
        };

        if (!player.effects) {
          player.effects = [];
        }
        player.effects.push(newEffect);
      }
    }

    // Remove from equipment
    if (shouldRemoveItem) {
      player.equipment = player.equipment.filter(item => item.id !== action.itemId);
    }
  }
}
