import { act, renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import playerStatsStore from './player-stats-store';
import playerStatsSyncService from './player-stats-sync.service';
import usePlayerStatsSnapshot from './use-player-stats-snapshot';
import { makePlayer, makePlayerSnapshot } from '../game/test-fixtures';

beforeEach(() => playerStatsStore.setSnapshot(playerStatsStore.getServerSnapshot()));
afterEach(() => jest.restoreAllMocks());

it('provides stable snapshots and publishes calculated state to React synchronously', () => {
  const { result } = renderHook(() => usePlayerStatsSnapshot());
  const initial = result.current;
  expect(initial.activePlayer).toBeNull();
  expect(playerStatsStore.getSnapshot()).toBe(initial);
  const player = makePlayer();
  act(() => playerStatsSyncService.updatePlayer(player, makePlayerSnapshot()));
  expect(result.current).toMatchObject({ sourcePlayer: player, activePlayer: { id: player.id } });
  expect(result.current).not.toBe(initial);
  expect(playerStatsStore.getSnapshot()).toBe(result.current);
  act(() => playerStatsSyncService.updateInventory({ equipment: [], equipped: {}, coins: 0 }, player));
  expect(result.current.activePlayer?.coins).toBe(0);
  expect(initial.activePlayer).toBeNull();
});

it('unsubscribes on unmount without resubscribing on ordinary renders', () => {
  const subscribe = playerStatsStore.subscribe.bind(playerStatsStore);
  const dispose = jest.fn();
  const spy = jest.spyOn(playerStatsStore, 'subscribe').mockImplementation(listener => {
    const unsubscribe = subscribe(listener);
    return () => { unsubscribe(); dispose(); };
  });
  const { rerender, unmount } = renderHook(() => usePlayerStatsSnapshot());
  rerender();
  expect(spy).toHaveBeenCalledTimes(1);
  unmount();
  expect(dispose).toHaveBeenCalledTimes(1);
});

it('keeps server rendering on the empty snapshot even when the client store has a player', () => {
  playerStatsSyncService.updatePlayer(makePlayer(), makePlayerSnapshot());
  function Stats() {
    const { activePlayer } = usePlayerStatsSnapshot();
    return <p>{activePlayer?.name ?? 'Loading...'}</p>;
  }
  expect(renderToString(<Stats />)).toContain('Loading...');
});
