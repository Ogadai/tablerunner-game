'use client';

import { emptyPlayerStats, type PlayerStatsSnapshot } from '@/lib/store/playerTurnStats';

const initialSnapshot: PlayerStatsSnapshot = {
  sourcePlayer: null,
  inventoryState: null,
  actionsState: { actions: [] },
  addStatsState: null,
  playerStats: emptyPlayerStats,
  activePlayer: null,
};

class PlayerStatsStore {
  private snapshot = initialSnapshot;
  private readonly listeners = new Set<() => void>();

  getSnapshot(): PlayerStatsSnapshot {
    return this.snapshot;
  }

  getServerSnapshot(): PlayerStatsSnapshot {
    return initialSnapshot;
  }

  setSnapshot(snapshot: PlayerStatsSnapshot): void {
    this.snapshot = snapshot;
    this.listeners.forEach(listener => listener());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
}

const playerStatsStore = new PlayerStatsStore();
export default playerStatsStore;
