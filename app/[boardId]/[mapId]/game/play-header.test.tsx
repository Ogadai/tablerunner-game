import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getGameState } from '@/lib/store/gameState';
import { fetchPlayerSnapshot } from './player-snapshot';
import { getPlayerReadyState, setPlayerReady } from '@/lib/store/playerReadyState';
import type { PlayerReadyState } from '@/lib/store/types';
import GameTopicService from '@/app/message-bus/game-topic-service';
import PlayerReadyTopicService from '@/app/message-bus/playerReady-topic-service';
import gameStateSyncService from './game-state-sync-service';
import readyStateSyncService from './ready-state-sync-service';
import PlayHeader from './play-header';
import PlayHeaderMenu from './play-header-menu';
import { makeCharacter, makeGameState, makePlayer, makePlayerSnapshot } from './test-fixtures';

jest.mock('next/navigation', () => ({ useParams: jest.fn(), useRouter: jest.fn() }));
jest.mock('@/lib/store/gameState', () => ({ getGameState: jest.fn() }));
jest.mock('./player-snapshot', () => ({ fetchPlayerSnapshot: jest.fn() }));
jest.mock('@/lib/store/playerReadyState', () => ({ getPlayerReadyState: jest.fn(), setPlayerReady: jest.fn() }));
jest.mock('@/app/message-bus/game-topic-service', () => ({ __esModule: true, default: { subscribe: jest.fn() } }));
jest.mock('@/app/message-bus/playerReady-topic-service', () => ({ __esModule: true, default: { subscribe: jest.fn() } }));
jest.mock('./game-state-sync-service', () => ({ __esModule: true, default: { set: jest.fn() } }));
jest.mock('./ready-state-sync-service', () => ({ __esModule: true, default: { set: jest.fn() } }));
jest.mock('./play-header-menu', () => ({
  __esModule: true,
  default: jest.fn<ReturnType<typeof PlayHeaderMenu>, [ComponentProps<typeof PlayHeaderMenu>]>(() => <div>Game menu</div>),
}));
jest.mock('./play-header-messages', () => ({
  __esModule: true, default: () => <div>Player messages</div>,
}));

describe('PlayHeader', () => {
  const push = jest.fn();
  const disposeGame = jest.fn();
  const disposeReady = jest.fn();
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;
  let gameChanged: () => void;
  let readyChanged: (state: PlayerReadyState) => void;
  const game = makeGameState({ players: [makePlayer(), makePlayer({ id: 'mage', health: 0 })] });
  const advance = async (ms: number) => { await act(async () => { await jest.advanceTimersByTimeAsync(ms); }); };
  const mount = async (onReadyCountdownChange = jest.fn()) => {
    let view!: ReturnType<typeof render>;
    await act(async () => { view = render(<PlayHeader boardId="board" mapId="map" onReadyCountdownChange={onReadyCountdownChange} />); });
    return view;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = fetchMock;
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    jest.mocked(useParams).mockReturnValue({ playerId: 'warrior' });
    jest.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    jest.mocked(getGameState).mockResolvedValue({ success: true, data: game });
    jest.mocked(fetchPlayerSnapshot).mockResolvedValue(makePlayerSnapshot({ gameState: game }));
    jest.mocked(getPlayerReadyState).mockResolvedValue({ success: true, data: { readyPlayerIds: ['mage'] } });
    jest.mocked(GameTopicService.subscribe).mockImplementation((_topic, callback) => { gameChanged = callback; return disposeGame; });
    jest.mocked(PlayerReadyTopicService.subscribe).mockImplementation((_topic, callback) => { readyChanged = callback; return disposeReady; });
  });
  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('shows the fallback while loading or when no game exists', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof fetchPlayerSnapshot>>) => void;
    jest.mocked(fetchPlayerSnapshot).mockReturnValue(new Promise(done => { resolve = done; }));
    await mount();
    expect(screen.getByRole('heading', { name: 'TableRunner' })).toBeInTheDocument();
    await act(async () => resolve(makePlayerSnapshot({ gameState: null })));
    expect(screen.getByRole('heading', { name: 'TableRunner' })).toBeInTheDocument();
    expect(gameStateSyncService.set).toHaveBeenCalledWith('board', 'map', undefined, expect.objectContaining({ gameState: null }));
  });

  it('loads, synchronizes and refreshes game and ready state from their topics', async () => {
    await mount();
    expect(fetchPlayerSnapshot).toHaveBeenCalledWith('board', 'map', 'warrior', expect.any(AbortSignal));
    expect(getGameState).not.toHaveBeenCalled();
    expect(getPlayerReadyState).toHaveBeenCalledWith('board', 'map');
    expect(GameTopicService.subscribe).toHaveBeenCalledWith('board-map', expect.any(Function));
    expect(PlayerReadyTopicService.subscribe).toHaveBeenCalledWith('board-map', expect.any(Function));
    expect(gameStateSyncService.set).toHaveBeenCalledWith('board', 'map', game, expect.objectContaining({ gameState: game }));
    expect(readyStateSyncService.set).toHaveBeenCalledWith('board', 'map', { readyPlayerIds: ['mage'] });
    expect(screen.getByText('check')).toBeInTheDocument();
    expect(screen.getByText('skull')).toBeInTheDocument();
    expect(screen.getByText('Player messages')).toBeInTheDocument();
    const updated = makeGameState({ ...game, turn: 2 });
    jest.mocked(fetchPlayerSnapshot).mockResolvedValue(makePlayerSnapshot({ gameState: updated }));
    await act(async () => gameChanged());
    expect(gameStateSyncService.set).toHaveBeenLastCalledWith('board', 'map', updated, expect.objectContaining({ gameState: updated }));
    expect(fetchPlayerSnapshot).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await act(async () => readyChanged({ readyPlayerIds: [] }));
    expect(screen.queryByText('check')).not.toBeInTheDocument();
    expect(readyStateSyncService.set).toHaveBeenLastCalledWith('board', 'map', { readyPlayerIds: [] });
  });

  it('navigates to the player list or a selected player', async () => {
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'add' }));
    expect(push).toHaveBeenLastCalledWith('/board/map');
    fireEvent.click(screen.getByRole('button', { name: /skull/ }));
    expect(push).toHaveBeenLastCalledWith('/board/map/mage');
  });

  it('passes the current game and snapshot to the menu and synchronizes team updates without refetching', async () => {
    const race = makeGameState({ ...game, gameId: 'racefire' });
    const snapshot = makePlayerSnapshot({ gameState: race });
    jest.mocked(fetchPlayerSnapshot).mockResolvedValue(snapshot);
    await mount();
    const props = jest.mocked(PlayHeaderMenu).mock.calls.at(-1)![0];
    expect(props).toEqual(expect.objectContaining({ boardId: 'board', mapId: 'map', gameState: race, snapshot }));
    const updated = { ...snapshot, instructions: { team: 'red' } };
    await act(async () => props.onSnapshotChange!(updated));
    expect(gameStateSyncService.set).toHaveBeenLastCalledWith('board', 'map', race, updated);
    expect(jest.mocked(PlayHeaderMenu).mock.calls.at(-1)![0].snapshot).toBe(updated);
    expect(fetchPlayerSnapshot).toHaveBeenCalledTimes(1);
    expect(getGameState).not.toHaveBeenCalled();
  });

  it('does not pass a player snapshot to the menu on the player list page', async () => {
    jest.mocked(useParams).mockReturnValue({});
    await mount();
    expect(jest.mocked(PlayHeaderMenu).mock.calls.at(-1)![0].snapshot).toBeUndefined();
  });

  it('withholds the old snapshot from the menu while a new player is loading', async () => {
    const view = await mount();
    let resolve!: (snapshot: Awaited<ReturnType<typeof fetchPlayerSnapshot>>) => void;
    jest.mocked(fetchPlayerSnapshot).mockReturnValueOnce(new Promise(done => { resolve = done; }));
    jest.mocked(useParams).mockReturnValue({ playerId: 'mage' });
    await act(async () => view.rerender(<PlayHeader boardId="board" mapId="map" />));
    expect(jest.mocked(PlayHeaderMenu).mock.calls.at(-1)![0].snapshot).toBeUndefined();
    const snapshot = makePlayerSnapshot({ playerId: 'mage', gameState: game });
    await act(async () => resolve(snapshot));
    expect(jest.mocked(PlayHeaderMenu).mock.calls.at(-1)![0].snapshot).toBe(snapshot);
  });

  it('discards a refresh that completes after a newer refresh', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof fetchPlayerSnapshot>>) => void;
    jest.mocked(fetchPlayerSnapshot).mockReturnValueOnce(new Promise(done => { resolve = done; }));
    await mount();
    const newer = makePlayerSnapshot({ gameState: makeGameState({ ...game, turn: 2 }) });
    jest.mocked(fetchPlayerSnapshot).mockResolvedValue(newer);
    await act(async () => gameChanged());
    await act(async () => resolve(makePlayerSnapshot({ gameState: game })));
    expect(gameStateSyncService.set).toHaveBeenCalledTimes(1);
    expect(gameStateSyncService.set).toHaveBeenLastCalledWith('board', 'map', newer.gameState, newer);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reloads on player switches and ignores the old player response', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof fetchPlayerSnapshot>>) => void;
    jest.mocked(fetchPlayerSnapshot).mockReturnValueOnce(new Promise(done => { resolve = done; }));
    const view = await mount();
    const signal = jest.mocked(fetchPlayerSnapshot).mock.calls[0][3];
    const mage = makePlayerSnapshot({ playerId: 'mage', gameState: game });
    jest.mocked(fetchPlayerSnapshot).mockResolvedValue(mage);
    jest.mocked(useParams).mockReturnValue({ playerId: 'mage' });
    await act(async () => view.rerender(<PlayHeader boardId="board" mapId="map" />));
    expect(signal.aborted).toBe(true);
    expect(fetchPlayerSnapshot).toHaveBeenLastCalledWith('board', 'map', 'mage', expect.any(AbortSignal));
    await act(async () => resolve(makePlayerSnapshot({ gameState: game })));
    expect(gameStateSyncService.set).toHaveBeenCalledTimes(1);
    expect(gameStateSyncService.set).toHaveBeenLastCalledWith('board', 'map', game, mage);
  });

  it('keeps the last snapshot when a refresh fails', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    await mount();
    const failure = new Error('offline');
    jest.mocked(fetchPlayerSnapshot).mockRejectedValue(failure);
    await act(async () => gameChanged());
    expect(gameStateSyncService.set).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Player messages')).toBeInTheDocument();
    expect(error).toHaveBeenCalledWith('Unable to refresh game state', failure);
  });

  it('hides add at capacity and hides player-specific messages on the list page', async () => {
    jest.mocked(fetchPlayerSnapshot).mockResolvedValue(makePlayerSnapshot({ gameState: makeGameState({
      characters: ['warrior', 'mage', 'rogue', 'cleric'].map(makeCharacter),
      players: ['warrior', 'mage', 'rogue', 'cleric'].map(id => makePlayer({ id })),
    }) }));
    const view = await mount();
    expect(screen.queryByRole('button', { name: 'add' })).not.toBeInTheDocument();
    jest.mocked(useParams).mockReturnValue({});
    await act(async () => view.rerender(<PlayHeader boardId="board" mapId="map" />));
    expect(screen.queryByText('Player messages')).not.toBeInTheDocument();
    expect(getGameState).toHaveBeenCalledWith('board', 'map');
  });

  it('automatically readies the last unready player after exactly fifteen seconds', async () => {
    const countdown = jest.fn();
    await mount(countdown);
    await advance(0);
    expect(countdown).toHaveBeenLastCalledWith(15);
    await advance(14000);
    expect(countdown).toHaveBeenLastCalledWith(1);
    expect(setPlayerReady).not.toHaveBeenCalled();
    await advance(1000);
    expect(countdown).toHaveBeenLastCalledWith(null);
    expect(setPlayerReady).toHaveBeenCalledWith('board', 'map', 'warrior', true);
    await advance(15000);
    expect(setPlayerReady).toHaveBeenCalledTimes(1);
  });

  it.each([{ readyPlayerIds: [] }, { readyPlayerIds: ['warrior'] }, { readyPlayerIds: ['warrior', 'mage'] }])('does not start a countdown for readiness %j', async ({ readyPlayerIds }) => {
    jest.mocked(getPlayerReadyState).mockResolvedValue({ success: true, data: { readyPlayerIds } });
    const countdown = jest.fn();
    await mount(countdown);
    await advance(16000);
    expect(countdown).not.toHaveBeenCalledWith(15);
    expect(setPlayerReady).not.toHaveBeenCalled();
  });

  it('does not auto-ready a solo player', async () => {
    jest.mocked(fetchPlayerSnapshot).mockResolvedValue(makePlayerSnapshot({ gameState: makeGameState({ players: [makePlayer()] }) }));
    await mount();
    await advance(16000);
    expect(setPlayerReady).not.toHaveBeenCalled();
  });

  it('cancels the countdown when readiness changes and starts a fresh countdown when eligible again', async () => {
    const countdown = jest.fn();
    await mount(countdown);
    await advance(5000);
    await act(async () => readyChanged({ readyPlayerIds: [] }));
    await advance(16000);
    expect(countdown).toHaveBeenLastCalledWith(null);
    expect(setPlayerReady).not.toHaveBeenCalled();
    await act(async () => readyChanged({ readyPlayerIds: ['mage'] }));
    await advance(0);
    expect(countdown).toHaveBeenLastCalledWith(15);
  });

  it('aborts processing, disposes subscriptions and cancels timers on unmount', async () => {
    const view = await mount();
    await advance(1000);
    expect(fetchMock).toHaveBeenCalledWith('/api/processing', expect.objectContaining({
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ boardId: 'board', mapId: 'map' }),
    }));
    const signal: AbortSignal = fetchMock.mock.calls[0][1].signal;
    expect(signal.aborted).toBe(false);
    view.unmount();
    expect(signal.aborted).toBe(true);
    expect(disposeGame).toHaveBeenCalledTimes(1);
    expect(disposeReady).toHaveBeenCalledTimes(1);
    await advance(16000);
    expect(setPlayerReady).not.toHaveBeenCalled();
  });

  it.each([423, 500])('treats processing status %s appropriately', async status => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValue({ ok: false, status });
    await mount();
    if (status === 423) expect(error).not.toHaveBeenCalled();
    else expect(error).toHaveBeenCalledWith('Between-turn processing failed:', 500);
  });

  it('reports network failures', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('offline');
    fetchMock.mockRejectedValue(failure);
    await mount();
    expect(error).toHaveBeenCalledWith('Unable to request between-turn processing', failure);
  });

  it('does not report a fetch rejection caused by unmounting', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    let reject!: (error: Error) => void;
    fetchMock.mockReturnValue(new Promise((_resolve, fail) => { reject = fail; }));
    const view = await mount();
    view.unmount();
    await act(async () => reject(new Error('aborted')));
    expect(error).not.toHaveBeenCalled();
  });
});
