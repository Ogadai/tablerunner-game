import { act, renderHook } from '@testing-library/react';
import { EntityItemClass } from '@/lib/store/types';
import popupGateService, { hasPlayerMessageContent, useHasActivePopupWarning } from './popup-gate-service';

describe('popupGateService', () => {
  beforeEach(() => {
    popupGateService.reset();
  });

  afterEach(() => {
    popupGateService.reset();
  });

  it('tracks overlapping warnings and releases idempotently', () => {
    const { result } = renderHook(() => useHasActivePopupWarning());
    expect(result.current).toBe(false);

    let releaseFirst!: () => void;
    let releaseSecond!: () => void;
    act(() => {
      releaseFirst = popupGateService.enterWarning();
      releaseSecond = popupGateService.enterWarning();
    });
    expect(result.current).toBe(true);

    act(() => {
      releaseFirst();
      releaseFirst();
    });
    expect(result.current).toBe(true);

    act(() => {
      releaseSecond();
    });
    expect(result.current).toBe(false);
  });

  it('detects message content for messages and actual battle replays only', () => {
    expect(hasPlayerMessageContent(undefined)).toBe(false);
    expect(hasPlayerMessageContent({ messages: [] })).toBe(false);
    expect(hasPlayerMessageContent({ messages: [{ text: 'Found gold' }] })).toBe(true);
    expect(hasPlayerMessageContent({
      messages: [],
      battleReplay: {
        locationId: 1,
        initialEntities: [{
          id: 'p1', name: 'Hero', iconXY: { x: 0, y: 0 }, className: EntityItemClass.self, health: 10, maxHealth: 10,
        }],
        events: [{
          id: 'e1',
          initiatorId: 'p1',
          initiatorName: 'Hero',
          actionType: 'item',
          actionName: 'Potion',
          icon: { sheet: 'item', iconXY: { x: 0, y: 0 } },
          targets: [{ targetId: 'p1', targetName: 'Hero', healthDelta: 5, resultHealth: 10 }],
        }],
      },
    })).toBe(false);
    expect(hasPlayerMessageContent({
      messages: [],
      battleReplay: {
        locationId: 1,
        initialEntities: [],
        events: [{
          id: 'e2',
          initiatorId: 'm1',
          initiatorName: 'Goblin',
          actionType: 'attack',
          actionName: 'Slash',
          icon: { sheet: 'spell', iconXY: { x: 0, y: 0 } },
          targets: [{ targetId: 'p1', targetName: 'Hero', healthDelta: -4, resultHealth: 6 }],
        }],
      },
    })).toBe(true);
  });
});
