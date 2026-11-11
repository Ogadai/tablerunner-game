'use client';

import { useSyncExternalStore } from 'react';
import { isActualBattle } from '@/lib/runner/combat-log';
import type { PlayerMessagesState } from '@/lib/store/types';

type PopupGateListener = () => void;

class PopupGateService {
  private activeWarnings = 0;
  private readonly listeners = new Set<PopupGateListener>();

  hasActiveWarning = (): boolean => this.activeWarnings > 0;

  getServerSnapshot = (): boolean => false;

  enterWarning(): () => void {
    let released = false;
    this.activeWarnings += 1;
    if (this.activeWarnings === 1) {
      this.notify();
    }

    return () => {
      if (released) return;
      released = true;
      this.activeWarnings = Math.max(0, this.activeWarnings - 1);
      if (this.activeWarnings === 0) {
        this.notify();
      }
    };
  }

  subscribe = (listener: PopupGateListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  reset(): void {
    if (this.activeWarnings === 0) return;
    this.activeWarnings = 0;
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }
}

const popupGateService = new PopupGateService();

export function useHasActivePopupWarning(): boolean {
  return useSyncExternalStore(
    popupGateService.subscribe,
    popupGateService.hasActiveWarning,
    popupGateService.getServerSnapshot,
  );
}

export function hasPlayerMessageContent(playerMessages?: PlayerMessagesState): boolean {
  const hasReplay = Boolean(
    playerMessages?.battleReplay && isActualBattle(playerMessages.battleReplay),
  );
  return hasReplay || (playerMessages?.messages?.length ?? 0) > 0;
}

export default popupGateService;
