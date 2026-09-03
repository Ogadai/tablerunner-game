import { CharacterStats } from "../games/types";
import { PlayerAddStatsState, PlayerState } from "../store/types";
import { BaseParams } from "./base-params";
import { playerMessageAtLocation } from './game-messages';

const LEVEL_UP_RATIO = 0.4;
const STATS_PER_LEVEL = 2;

export async function levelUpPlayer(params: BaseParams, player: PlayerState): Promise<void> {
  const newLevel = calculateLevelFromPoints(player.points);

  if (newLevel > player.level) {
    playerMessageAtLocation(params, player.id,
      `**{player}** went up to **level ${newLevel}**`
    )
    player.level = newLevel;

    player.availableStats = (player.availableStats || 0) + (newLevel - player.level) * STATS_PER_LEVEL;
  }
}

export async function applyPlayerAddedStats(params: BaseParams, player: PlayerState, addStats: PlayerAddStatsState): Promise<void> {
  if (addStats !== null && addStats.characterStats !== null) {
    for(const statKey of Object.keys(addStats) as (keyof CharacterStats)[]) {
      const addAmount = Math.min(addStats.characterStats[statKey], player.availableStats);
      if (addAmount > 0) {
        player.characterStats[statKey] += addAmount;
        player.availableStats -= addAmount;
      }
    }
  }
}

function calculateLevelFromPoints(points: number): number {
  return 1 + Math.floor(Math.sqrt(points) * LEVEL_UP_RATIO);
}
