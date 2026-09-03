import { BaseStats, PlayerEquipableItem } from '../games/types';
import { PlayerState } from './types';

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
