import type service from './game-state-sync-service';
import { makeGameState, makePlayerSnapshot } from './test-fixtures';

jest.mock('./game-state-lighting-service', () => ({
  __esModule: true, default: { update: jest.fn() },
}));

describe('gameStateSyncService', () => {
  let sync: typeof service;
  let updateLighting: jest.Mock;

  beforeEach(async () => {
    jest.resetModules();
    sync = (await import('./game-state-sync-service')).default;
    updateLighting = (await import('./game-state-lighting-service')).default.update as jest.Mock;
  });

  it('starts loading and completes loading even when no game exists', () => {
    expect(sync.loading).toBe(true);
    expect(sync.get('board', 'map')).toBeUndefined();
    const listener = jest.fn();
    sync.subscribe('board', 'map', listener);
    sync.set('board', 'map', undefined);
    expect(sync.loading).toBe(false);
    expect(listener).toHaveBeenCalledWith(undefined);
    expect(updateLighting).toHaveBeenCalledWith('board', 'map', undefined);
  });

  it('isolates cached games and notifications by both board and map', () => {
    const game = makeGameState();
    const listener = jest.fn(() => expect(sync.get('board', 'map')).toBe(game));
    const other = jest.fn();
    sync.subscribe('board', 'map', listener);
    sync.subscribe('other', 'map', other);
    sync.subscribe('board', 'other', other);
    expect(listener).not.toHaveBeenCalled();
    sync.set('board', 'map', game);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(other).not.toHaveBeenCalled();
    expect(sync.get('other', 'map')).toBeUndefined();
    expect(sync.get('board', 'other')).toBeUndefined();
    expect(updateLighting).toHaveBeenCalledWith('board', 'map', game);
  });

  it('unsubscribes independently, supports resubscription and replaces cached state', () => {
    const first = jest.fn();
    const second = jest.fn();
    const stopFirst = sync.subscribe('board', 'map', first);
    const stopSecond = sync.subscribe('board', 'map', second);
    stopFirst();
    stopFirst();
    sync.set('board', 'map', makeGameState());
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    stopSecond();
    sync.subscribe('board', 'map', first);
    sync.set('board', 'map', undefined);
    expect(first).toHaveBeenCalledWith(undefined);
    expect(second).toHaveBeenCalledTimes(1);
    expect(sync.get('board', 'map')).toBeUndefined();
  });

  it('publishes matching snapshots with game state and clears them on a game-only update', () => {
    const snapshot = makePlayerSnapshot();
    const listener = jest.fn(() => expect(sync.getPlayerSnapshot('board', 'map', 'warrior')).toBe(snapshot));
    const dispose = sync.subscribe('board', 'map', listener);
    sync.set('board', 'map', snapshot.gameState!, snapshot);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(sync.getPlayerSnapshot('board', 'map', 'mage')).toBeUndefined();
    expect(sync.getPlayerSnapshot('other', 'map', 'warrior')).toBeUndefined();
    expect(sync.getPlayerSnapshot('board', 'other', 'warrior')).toBeUndefined();
    dispose();
    sync.set('board', 'map', makeGameState());
    expect(sync.getPlayerSnapshot('board', 'map', 'warrior')).toBeUndefined();
  });
});
