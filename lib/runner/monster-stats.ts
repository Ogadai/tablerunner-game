import { monsters } from "../games/monsters";
import { BaseStats } from "../games/types";
import { MonsterState } from "../store/types";

export function getMonsterStats(monster: MonsterState): BaseStats {
  const baseStats = { ...monsters[monster.type].baseStats };

  if (monster.effects) {
    for (const effect of monster.effects) {
      const { description, special, turns, ...effectBonuses } = effect;

      for (const stat of Object.keys(effectBonuses)) {
        const bonusAmount = (effectBonuses as any)[stat];
        if (bonusAmount) {
          (baseStats as any)[stat] += bonusAmount;
        }
      }
    }
  }

  return baseStats;
}
