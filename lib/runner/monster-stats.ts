import { monsters } from "../games/monsters";
import { BaseStats } from "../games/types";
import { MonsterState } from "../store/types";

export function getMonsterStats(monster: MonsterState): BaseStats {
  const baseStats: BaseStats = {
    ...monsters[monster.type].baseStats,
    bonuses: {
      attack: 0,
      damage: 0,
      defence: 0,
      magic: 0,
      health: 0,
      speed: 0,
    },
  };

  if (monster.effects) {
    for (const effect of monster.effects) {
      const { description, special, turns, ...effectBonuses } = effect;

      for (const stat of Object.keys(effectBonuses)) {
        const bonusAmount = (effectBonuses as any)[stat];
        if (bonusAmount) {
          (baseStats as any)[stat] += bonusAmount;
          (baseStats.bonuses as any)[stat] += bonusAmount;
        }
      }
    }
  }

  return baseStats;
}
