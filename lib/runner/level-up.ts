import { CharacterStats } from "../games/types";
import { PlayerAddStatsState, PlayerState } from "../store/types";
import { getPlayerStats } from '../store/playerStats';
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

    player.availableStats = (player.availableStats || 0) + (newLevel - player.level) * STATS_PER_LEVEL;
    player.level = newLevel;

    console.log('Assigned player stats', player.level, player.availableStats);
  }
}

export async function applyPlayerAddedStats(params: BaseParams, player: PlayerState, addStats: PlayerAddStatsState): Promise<void> {
  if (addStats !== null && !!addStats.characterStats) {
    for(const statKey of Object.keys(addStats.characterStats) as (keyof CharacterStats)[]) {
      const addAmount = Math.min(addStats.characterStats[statKey], player.availableStats);
      if (addAmount > 0) {
        player.characterStats[statKey] += addAmount;
        player.availableStats -= addAmount;
      }
    }
    player.baseStats = getPlayerStats(player);
  }
}

function calculateLevelFromPoints(points: number): number {
  return 1 + Math.floor(Math.sqrt(points) * LEVEL_UP_RATIO);
}
