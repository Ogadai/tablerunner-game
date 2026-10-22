'use client';

import { useCallback, useSyncExternalStore } from 'react';
import readyStateSyncService from './ready-state-sync-service';

export default function useReadyStateSnapshot(boardId: string, mapId: string) {
  return useSyncExternalStore(
    useCallback(listener => readyStateSyncService.subscribe(boardId, mapId, listener), [boardId, mapId]),
    useCallback(() => readyStateSyncService.get(boardId, mapId), [boardId, mapId]),
    readyStateSyncService.getServerSnapshot,
  );
}
