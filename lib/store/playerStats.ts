import { BaseStats, PlayerEquipableItem } from '../games/types';
import { PlayerActionsState, PlayerActionType, PlayerState } from './types';

const BASE_ACTIONS_PER_TURN = 20;
const BASE_MOVE_ACTION_COST = 18;
const BASE_ATTACK_ACTION_COST = 15;

export interface PlayerActionsPerTurn {
  total: number,
  move: number,
  attack: number,
}

export function getPlayerActionsPerTurn(playerState: PlayerState): PlayerActionsPerTurn {
  const playerSpeed = playerState.baseStats!.speed;
  const speedBonus = Math.min(10, Math.floor(playerSpeed / 5));

  return {
    total: BASE_ACTIONS_PER_TURN,
    move: BASE_MOVE_ACTION_COST - speedBonus,
    attack: BASE_ATTACK_ACTION_COST - speedBonus,
  };
}

export function getPlayerActionsCosts(playerState: PlayerState, actionsState: PlayerActionsState): number {
  if (!actionsState || !actionsState.actions) {
    return 0;
  }

  const actionsPerTurn = getPlayerActionsPerTurn(playerState);

  return actionsState.actions.reduce((total, action) => {
    switch(action.type) {
      case PlayerActionType.Attack:
        return total + actionsPerTurn.attack;
      case PlayerActionType.Move:
        return total + actionsPerTurn.move;
      default:
        return total;
    }
  }, 0);
}

export function getPlayerStats(playerState: PlayerState): BaseStats {
  const weaponId = playerState.equipped.weapon;
  const weapon = !!weaponId && playerState.equipment.find(e => e.id == weaponId) as PlayerEquipableItem;
  const ranged = !!weapon && !!weapon.ranged;

  const pStats = playerState.characterStats;
  const baseStats: BaseStats = {
    attack: ranged ? pStats.skill : pStats.strength,
    damage: ranged ? pStats.skill : pStats.strength,
    defence: Math.ceil((pStats.reactions + pStats.skill + pStats.strength) / 3),
    magic: pStats.intelligence,
    health: pStats.resiliance,
    speed: pStats.reactions,
    bonuses: {
      attack: 0,
      damage: 0,
      defence: 0,
      magic: 0,
      health: 0,
      speed: 0,
    }
  };

  for(const slot of Object.keys(playerState.equipped)) {
    const itemId = (playerState.equipped as any)[slot] as (string | undefined | null);
    const item = !!itemId && playerState.equipment.find(e => e.id == itemId) as PlayerEquipableItem;
    if (item) {
      for(const stat of Object.keys(item.bonusStats)) {
        const bonusAmount = (item.bonusStats as any)[stat];
        if (bonusAmount) {
          (baseStats as any)[stat] += bonusAmount;
          (baseStats.bonuses as any)[stat] += bonusAmount;
        }
      }
    }
  }

  return baseStats;
}
