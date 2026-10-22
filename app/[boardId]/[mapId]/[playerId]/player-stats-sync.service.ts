'use client';

import { calculatePlayerTurnStats, type PlayerStatsInputs } from '@/lib/store/playerTurnStats';
import type { PlayerActionsState, PlayerAddStatsState, PlayerInventoryState, PlayerState, PlayerTurnInputs } from '@/lib/store/types';
import playerStatsStore from './player-stats-store';

class PlayerStatsSyncService {
  updatePlayer(player: PlayerState, inputs: PlayerTurnInputs): void {
    this.publish({
      sourcePlayer: player,
      inventoryState: inputs.inventory,
      actionsState: inputs.actions,
      addStatsState: inputs.addedStats,
    });
  }

  updateInventory(inventoryState: PlayerInventoryState | undefined, sourcePlayer?: PlayerState): void {
    // Missing data from a failed action must not clear the current inventory.
    if (!inventoryState || !this.isCurrentPlayer(sourcePlayer)) return;
    this.publish({ ...playerStatsStore.getSnapshot(), inventoryState });
  }

  updateActionsState(actionsState: PlayerActionsState | undefined, sourcePlayer?: PlayerState): void {
    if (!actionsState || !this.isCurrentPlayer(sourcePlayer)) return;
    this.publish({ ...playerStatsStore.getSnapshot(), actionsState });
  }

  updateAddStatsState(addStatsState: PlayerAddStatsState, sourcePlayer?: PlayerState): void {
    if (!this.isCurrentPlayer(sourcePlayer)) return;
    this.publish({ ...playerStatsStore.getSnapshot(), addStatsState });
  }

  private isCurrentPlayer(sourcePlayer?: PlayerState): boolean {
    return !sourcePlayer || sourcePlayer === playerStatsStore.getSnapshot().sourcePlayer;
  }

  private publish(inputs: PlayerStatsInputs): void {
    playerStatsStore.setSnapshot({ ...inputs, ...calculatePlayerTurnStats(inputs) });
  }
}

const playerStatsSyncService = new PlayerStatsSyncService();
export default playerStatsSyncService;
