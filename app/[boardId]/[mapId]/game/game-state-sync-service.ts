'use client';

import { GameState, PlayerSnapshot } from '../../../../lib/store/types';
import gameStateLightingService from './game-state-lighting-service';

type GameStateListener = (gameState: GameState | undefined) => void;

class GameStateSyncService {
  private readonly gameStates = new Map<string, GameState | undefined>();
  private readonly playerSnapshots = new Map<string, PlayerSnapshot>();
  private readonly listeners = new Map<string, Set<GameStateListener>>();

  private getKey(boardId: string, mapId: string): string {
    return `${boardId}:${mapId}`;
  }

  private _loading = true;
  public get loading() { return this._loading; }

  get(boardId: string, mapId: string): GameState | undefined {
    return this.gameStates.get(this.getKey(boardId, mapId));
  }

  getPlayerSnapshot(boardId: string, mapId: string, playerId: string): PlayerSnapshot | undefined {
    const snapshot = this.playerSnapshots.get(this.getKey(boardId, mapId));
    return snapshot?.playerId === playerId ? snapshot : undefined;
  }

  set(boardId: string, mapId: string, gameState: GameState | undefined, snapshot?: PlayerSnapshot): void {
    const key = this.getKey(boardId, mapId);
    this.gameStates.set(key, gameState);
    if (snapshot && snapshot.gameState === gameState) {
      this.playerSnapshots.set(key, snapshot);
    } else {
      this.playerSnapshots.delete(key);
    }
    this._loading = false;
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
