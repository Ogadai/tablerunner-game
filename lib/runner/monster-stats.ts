import { monsters } from "../games/monsters";
import { BaseStats } from "../games/types";
import { ITarget, MonsterState } from "../store/types";

export function getMonsterStats(monster: MonsterState): BaseStats {
  return getEnhancedStats(monsters[monster.type].baseStats, monster);
}

function getEnhancedStats(baseStats: BaseStats, target: ITarget): BaseStats {
  const baseStatsWithBonuses: BaseStats = {
    ...baseStats,
    bonuses: {
      attack: 0,
      damage: 0,
      defence: 0,
      magic: 0,
      health: 0,
      speed: 0,
    },
  };

  if (target.effects) {
    for (const effect of target.effects) {
      const { description, special, turns, ...effectBonuses } = effect;

      for (const stat of Object.keys(effectBonuses)) {
        const bonusAmount = (effectBonuses as any)[stat];
        if (bonusAmount) {
          (baseStatsWithBonuses as any)[stat] += bonusAmount;
          (baseStatsWithBonuses.bonuses as any)[stat] += bonusAmount;
        }
      }
    }
  }

  return baseStatsWithBonuses;
}