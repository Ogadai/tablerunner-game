import { allItems } from '../games/items';
import { GameState, PlayerState } from '../store/types';
import { STATS_PER_LEVEL } from './level-up';

export interface MidGameJoinCatchUp {
  level: number;
  points: number;
  availableStats: number;
  coins: number;
}

export function getPlayerTotalCoinValue(player: PlayerState): number {
  const itemsValue = player.equipment.reduce(
    (sum, item) => sum + (allItems[item.type]?.value ?? 0),
    0,
  );
  return player.coins + itemsValue;
}

export function calculateMidGameJoinCatchUp(
  gameState: GameState | undefined,
  initialAvailableStats: number,
): MidGameJoinCatchUp | null {
  if (!gameState || gameState.turn <= 0 || gameState.players.length === 0) {
    return null;
  }

  const lowestPlayer = gameState.players.reduce((lowest, player) => {
    if (player.level !== lowest.level) {
      return player.level < lowest.level ? player : lowest;
    }
    return player.points < lowest.points ? player : lowest;
  });

  const totalCoinValue = gameState.players.reduce(
    (sum, player) => sum + getPlayerTotalCoinValue(player),
    0,
  );
  const averageCoins = Math.round(totalCoinValue / gameState.players.length);

  return {
    level: lowestPlayer.level,
    points: lowestPlayer.points,
    availableStats: initialAvailableStats + Math.max(0, lowestPlayer.level - 1) * STATS_PER_LEVEL,
    coins: averageCoins,
  };
}
