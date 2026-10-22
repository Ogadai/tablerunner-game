'use client';

import { GameState, PlayerSnapshot } from '../../../../lib/store/types';
import gameStateLightingService from './game-state-lighting-service';

type GameStateListener = (gameState: GameState | undefined) => void;

export interface GameStateSyncSnapshot {
  readonly gameState: GameState | undefined;
  readonly playerSnapshot: PlayerSnapshot | undefined;
  readonly loading: boolean;
}

const loadingSnapshot: GameStateSyncSnapshot = {
  gameState: undefined,
  playerSnapshot: undefined,
  loading: true,
};

class GameStateSyncService {
  private readonly snapshots = new Map<string, GameStateSyncSnapshot>();
  private readonly listeners = new Map<string, Set<GameStateListener>>();

  private getKey(boardId: string, mapId: string): string {
    return `${boardId}:${mapId}`;
  }

  getSnapshot(boardId: string, mapId: string): GameStateSyncSnapshot {
    return this.snapshots.get(this.getKey(boardId, mapId)) ?? loadingSnapshot;
  }

  getServerSnapshot(): GameStateSyncSnapshot {
    return loadingSnapshot;
  }

  get(boardId: string, mapId: string): GameState | undefined {
    return this.getSnapshot(boardId, mapId).gameState;
  }

  getPlayerSnapshot(boardId: string, mapId: string, playerId: string): PlayerSnapshot | undefined {
    const snapshot = this.getSnapshot(boardId, mapId).playerSnapshot;
    return snapshot?.playerId === playerId ? snapshot : undefined;
  }

  set(boardId: string, mapId: string, gameState: GameState | undefined, snapshot?: PlayerSnapshot): void {
    const key = this.getKey(boardId, mapId);
    this.snapshots.set(key, {
      gameState,
      playerSnapshot: snapshot?.gameState === gameState ? snapshot : undefined,
      loading: false,
    });
    this.listeners.get(key)?.forEach(listener => listener(gameState));

    gameStateLightingService.update(boardId, mapId, gameState);
  }

  subscribe(boardId: string, mapId: string, listener: GameStateListener): () => void {
    const key = this.getKey(boardId, mapId);
    const listeners = this.listeners.get(key) ?? new Set<GameStateListener>();
    listeners.add(listener);
    this.listeners.set(key, listeners);

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.listeners.delete(key);
      }
    };
  }
}

const gameStateSyncService = new GameStateSyncService();

export default gameStateSyncService;
