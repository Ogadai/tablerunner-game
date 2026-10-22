'use client';

import { useCallback, useSyncExternalStore } from 'react';
import gameStateSyncService from './game-state-sync-service';

export default function useGameStateSnapshot(boardId: string, mapId: string) {
  return useSyncExternalStore(
    useCallback(listener => gameStateSyncService.subscribe(boardId, mapId, listener), [boardId, mapId]),
    useCallback(() => gameStateSyncService.getSnapshot(boardId, mapId), [boardId, mapId]),
    gameStateSyncService.getServerSnapshot,
  );
}
