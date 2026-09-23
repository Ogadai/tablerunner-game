import { allItems } from '../games/items';
import { getSpellActionCost, spells } from '../games/spells';
import { BaseStats, ConsumableItemDef, EquipableItemDef } from '../games/types';
import { INamedTarget, PlayerActionCast, PlayerActionsState, PlayerActionType, PlayerActionUseItem, PlayerState } from './types';

const BASE_ACTIONS_PER_TURN = 20;
const BASE_MOVE_ACTION_COST = 18;
const BASE_ATTACK_ACTION_COST = 12;
export const LEARN_SCROLL_ACTION_COST = 10;

export interface PlayerActionsPerTurn {
  total: number,
  move: number,
  attack: number,
}

export function getPlayerActionsPerTurn(playerState: INamedTarget): PlayerActionsPerTurn {
  const playerSpeed = playerState.baseStats!.speed;
  const speedBonus = Math.min(10, Math.floor(playerSpeed / 5));

  return {
    total: playerState.health > 0 ? BASE_ACTIONS_PER_TURN : 0,
    move: BASE_MOVE_ACTION_COST - speedBonus,
    attack: BASE_ATTACK_ACTION_COST - speedBonus,
  };
}

export function getPlayerActionsCosts(playerState: INamedTarget, actionsState: PlayerActionsState | null | undefined): number {
  if (!actionsState || !actionsState.actions) {
    return 0;
  }

  const actionsPerTurn = getPlayerActionsPerTurn(playerState);

  return actionsState.actions.reduce((total, action) => {
    switch(action.type) {
      case PlayerActionType.Attack:
        return total + actionsPerTurn.attack;
      case PlayerActionType.Move:
      case PlayerActionType.Portal:
        return total + actionsPerTurn.move;
      case PlayerActionType.UseItem:
        const useAction = action as PlayerActionUseItem;
        const item = playerState.equipment.find(e => e.id == useAction.itemId);
        const itemDef: ConsumableItemDef = item && (allItems as any)[item.type];
        return total + (itemDef ? itemDef.useCost : 0);
      case PlayerActionType.Cast:
        const castAction = action as PlayerActionCast;
        const spell = spells[castAction.spellId];
        return total + getSpellActionCost(spell, playerState.baseStats!.magic);
      case PlayerActionType.ReadScroll:
        return total + LEARN_SCROLL_ACTION_COST;
      default:
        return total;
    }
  }, 0);
}

export function getPlayerActionsMagic(playerState: PlayerState, actionsState: PlayerActionsState  | null | undefined): number {
  if (!actionsState || !actionsState.actions) {
    return 0;
  }

  return actionsState.actions.reduce((total, action) => {
    switch(action.type) {
      case PlayerActionType.Cast:
        const spell = spells[(action as PlayerActionCast).spellId];
        return total + spell.magicCost;
      default:
        return total;
    }
  }, 0);
}

export function getNamedTargetStats(baseStats: BaseStats, target: Pick<INamedTarget, 'equipment' | 'equipped' | 'effects'>): BaseStats {
  const enhancedStats: BaseStats = {
    ...baseStats,
    bonuses: {
      attack: 0,
      damage: 0,
      defence: 0,
      magic: 0,
      health: 0,
      speed: 0,
    }
  };

  // Account for any equipment bonuses
  for(const slot of Object.keys(target.equipped)) {
    const itemId = (target.equipped as any)[slot] as (string | undefined | null);
    const item = !!itemId && target.equipment.find(e => e.id == itemId);
    const itemDef = item && allItems[item.type];
    if (itemDef) {
      for(const stat of Object.keys(itemDef.bonusStats!)) {
        const bonusAmount = (itemDef.bonusStats as any)[stat];
        if (bonusAmount) {
          (enhancedStats as any)[stat] += bonusAmount;
          (enhancedStats.bonuses as any)[stat] += bonusAmount;
        }
      }
    }
  }

  // Account for any effects
  if (target.effects) {
    for(const effect of target.effects) {
      const { description, special, turns, ...effectBonus } = effect;

      for(const stat of Object.keys(effectBonus)) {
        const bonusAmount = (effectBonus as any)[stat];
        if (bonusAmount) {
          (enhancedStats as any)[stat] += bonusAmount;
          (enhancedStats.bonuses as any)[stat] += bonusAmount;
        }
      }
    }
  }

  return enhancedStats;  
}

export function getPlayerStats(playerState: PlayerState): BaseStats {
  const weaponId = playerState.equipped.weapon;
  const weapon = !!weaponId && playerState.equipment.find(e => e.id == weaponId);
  const weaponType = weapon && allItems[weapon.type] as EquipableItemDef;
  const ranged = !!weaponType && !!weaponType.ranged;

  const pStats = playerState.characterStats;
  const baseStats: BaseStats = {
    attack: ranged ? pStats.skill : pStats.strength,
    damage: ranged ? pStats.skill : pStats.strength,
    defence: Math.ceil((pStats.reactions + pStats.skill + pStats.strength) / 3),
    magic: pStats.intelligence,
    health: pStats.resiliance,
    speed: pStats.reactions
  };

  return getNamedTargetStats(baseStats, playerState);
}
