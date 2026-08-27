'use client';

import { PlayerReadyState } from '../../../../lib/store/types';

type ReadyStateListener = (readyState: PlayerReadyState) => void;

class ReadyStateSyncService {
  private readonly readyStates = new Map<string, PlayerReadyState>();
  private readonly listeners = new Map<string, Set<ReadyStateListener>>();

  private getKey(boardId: string, mapId: string): string {
    return `${boardId}:${mapId}`;
  }

  get(boardId: string, mapId: string): PlayerReadyState {
    return this.readyStates.get(this.getKey(boardId, mapId))
      || { readyPlayerIds: [] };
  }

  set(boardId: string, mapId: string, gameState: PlayerReadyState): void {
    const key = this.getKey(boardId, mapId);
    this.readyStates.set(key, gameState);
    this.listeners.get(key)?.forEach(listener => listener(gameState));
  }

  subscribe(boardId: string, mapId: string, listener: ReadyStateListener): () => void {
    const key = this.getKey(boardId, mapId);
    const listeners = this.listeners.get(key) ?? new Set<ReadyStateListener>();
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

const readyStateSyncService = new ReadyStateSyncService();

export default readyStateSyncService;