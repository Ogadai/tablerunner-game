import type { BaseStats } from '../games/types';
import { getPlayerActionsCosts, getPlayerActionsMagic, getPlayerActionsPerTurn, getPlayerStats, type PlayerActionsPerTurn } from './playerStats';
import { PlayerActionType, type PlayerActionsState, type PlayerAddStatsState, type PlayerInventoryState, type PlayerState } from './types';

export interface PlayerStats {
  baseStats: BaseStats;
  health: number;
  magic: number;
  actionsPerTurn: PlayerActionsPerTurn;
  actionPointsUsed: number;
  actionPointsTotal: number;
  availablePoints: number;
  magicUsed: number;
  magicLeft: number;
  isAttacking: boolean;
  playerCanMove: boolean;
}

export interface PlayerStatsInputs {
  readonly sourcePlayer: PlayerState | null;
  readonly inventoryState: PlayerInventoryState | null;
  readonly actionsState: PlayerActionsState;
  readonly addStatsState: PlayerAddStatsState | null;
}

export interface CalculatedPlayerStats {
  readonly playerStats: PlayerStats;
  readonly activePlayer: PlayerState | null;
}

export interface PlayerStatsSnapshot extends PlayerStatsInputs, CalculatedPlayerStats {}

export const emptyPlayerStats: PlayerStats = {
  baseStats: { attack: 0, defence: 0, magic: 0, damage: 0, health: 0, speed: 0 },
  health: 0,
  magic: 0,
  actionsPerTurn: { attack: 0, move: 0, total: 0 },
  actionPointsUsed: 0,
  actionPointsTotal: 0,
  availablePoints: 0,
  magicUsed: 0,
  magicLeft: 0,
  isAttacking: false,
  playerCanMove: false,
};

export function calculatePlayerTurnStats({
  sourcePlayer: player, inventoryState, actionsState, addStatsState,
}: PlayerStatsInputs): CalculatedPlayerStats {
  if (!player) return { playerStats: emptyPlayerStats, activePlayer: null };

  const combinedPlayer: PlayerState = {
    ...player,
    equipped: inventoryState?.equipped ? { ...player.equipped, ...inventoryState.equipped } : { ...player.equipped },
    equipment: inventoryState?.equipment ?? player.equipment,
    coins: inventoryState?.coins ?? player.coins,
  };

  const addedStats = addStatsState?.characterStats;
  const effectivePlayer: PlayerState = {
    ...combinedPlayer,
    characterStats: addedStats ? {
      strength: combinedPlayer.characterStats.strength + addedStats.strength,
      skill: combinedPlayer.characterStats.skill + addedStats.skill,
      intelligence: combinedPlayer.characterStats.intelligence + addedStats.intelligence,
      resiliance: combinedPlayer.characterStats.resiliance + addedStats.resiliance,
      reactions: combinedPlayer.characterStats.reactions + addedStats.reactions,
    } : combinedPlayer.characterStats,
  };
  effectivePlayer.baseStats = getPlayerStats(effectivePlayer);

  const actionPointsUsed = getPlayerActionsCosts(effectivePlayer, actionsState);
  const actionsPerTurn = getPlayerActionsPerTurn(effectivePlayer);
  const actionPointsTotal = actionsPerTurn.total;
  const magicUsed = getPlayerActionsMagic(effectivePlayer, actionsState);
  const magicLeft = effectivePlayer.magic - magicUsed;
  const isAttacking = actionsState.actions.some(a => a.type === PlayerActionType.Attack);
  const actionPointsLeft = actionPointsTotal - actionPointsUsed;
  const playerCanMove = effectivePlayer.health > 0 && !isAttacking && actionPointsLeft >= actionsPerTurn.move;
  const allocatedPoints = addedStats ? Object.values(addedStats).reduce((total, points) => total + points, 0) : 0;
  const availablePoints = Math.max(0, effectivePlayer.availableStats - allocatedPoints);

  return {
    playerStats: {
      health: effectivePlayer.health,
      magic: effectivePlayer.magic,
      baseStats: effectivePlayer.baseStats,
      actionsPerTurn,
      actionPointsUsed,
      actionPointsTotal,
      availablePoints,
      magicUsed,
      magicLeft,
      isAttacking,
      playerCanMove,
    },
    // Character points stay persisted separately; base stats include pending allocations once.
    activePlayer: { ...combinedPlayer, baseStats: effectivePlayer.baseStats },
  };
}
