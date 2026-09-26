import type service from './ready-state-sync-service';

describe('readyStateSyncService', () => {
  let sync: typeof service;

  beforeEach(async () => {
    jest.resetModules();
    sync = (await import('./ready-state-sync-service')).default;
  });

  it('returns an independent empty default for unknown games', () => {
    sync.get('board', 'map').readyPlayerIds.push('warrior');
    expect(sync.get('board', 'map')).toEqual({ readyPlayerIds: [] });
  });

  it('stores and replaces readiness without notifying other boards or maps', () => {
    const listener = jest.fn();
    const other = jest.fn();
    sync.subscribe('board', 'map', listener);
    sync.subscribe('other', 'map', other);
    sync.subscribe('board', 'other', other);
    expect(listener).not.toHaveBeenCalled();
    const ready = { readyPlayerIds: ['warrior'], readyPlayerDirection: { warrior: 'n' as const } };
    sync.set('board', 'map', ready);
    expect(sync.get('board', 'map')).toEqual(ready);
    expect(listener).toHaveBeenCalledWith(ready);
    expect(other).not.toHaveBeenCalled();
    expect(sync.get('other', 'map')).toEqual({ readyPlayerIds: [] });
    expect(sync.get('board', 'other')).toEqual({ readyPlayerIds: [] });
    sync.set('board', 'map', { readyPlayerIds: [] });
    expect(sync.get('board', 'map')).toEqual({ readyPlayerIds: [] });
    expect(listener).toHaveBeenLastCalledWith({ readyPlayerIds: [] });
  });

  it('removes only the disposed listener and permits subscribing again after all dispose', () => {
    const first = jest.fn();
    const second = jest.fn();
    const stopFirst = sync.subscribe('board', 'map', first);
    const stopSecond = sync.subscribe('board', 'map', second);
    stopFirst();
    stopFirst();
    sync.set('board', 'map', { readyPlayerIds: [] });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    stopSecond();
    sync.subscribe('board', 'map', first);
    sync.set('board', 'map', { readyPlayerIds: ['mage'] });
    expect(first).toHaveBeenCalledWith({ readyPlayerIds: ['mage'] });
    expect(second).toHaveBeenCalledTimes(1);
  });
});
