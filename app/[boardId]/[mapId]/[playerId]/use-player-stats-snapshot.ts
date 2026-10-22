'use client';

import { useSyncExternalStore } from 'react';
import playerStatsStore from './player-stats-store';

const subscribe = (listener: () => void) => playerStatsStore.subscribe(listener);
const getSnapshot = () => playerStatsStore.getSnapshot();

export default function usePlayerStatsSnapshot() {
  return useSyncExternalStore(subscribe, getSnapshot, playerStatsStore.getServerSnapshot);
}
