import { monsters } from "../games/monsters";
import { BaseStats } from "../games/types";
import { MonsterState } from "../store/types";
import { getNamedTargetStats } from "../store/playerStats";

export function getMonsterStats(monster: MonsterState): BaseStats {
  return getNamedTargetStats(monsters[monster.type].baseStats, {
    equipment: monster.equipment ?? [],
    equipped: monster.equipped ?? {},
    effects: monster.effects,
  });
}
