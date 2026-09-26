import { act, fireEvent, render, screen } from '@testing-library/react';
import { useParams, useRouter } from 'next/navigation';
import { getGameState } from '@/lib/store/gameState';
import { getPlayerReadyState, setPlayerReady } from '@/lib/store/playerReadyState';
import type { PlayerReadyState } from '@/lib/store/types';
import GameTopicService from '@/app/message-bus/game-topic-service';
import PlayerReadyTopicService from '@/app/message-bus/playerReady-topic-service';
import gameStateSyncService from './game-state-sync-service';
import readyStateSyncService from './ready-state-sync-service';
import PlayHeader from './play-header';
import { makeCharacter, makeGameState, makePlayer } from './test-fixtures';

jest.mock('next/navigation', () => ({ useParams: jest.fn(), useRouter: jest.fn() }));
jest.mock('@/lib/store/gameState', () => ({ getGameState: jest.fn() }));
jest.mock('@/lib/store/playerReadyState', () => ({ getPlayerReadyState: jest.fn(), setPlayerReady: jest.fn() }));
jest.mock('@/app/message-bus/game-topic-service', () => ({ __esModule: true, default: { subscribe: jest.fn() } }));
jest.mock('@/app/message-bus/playerReady-topic-service', () => ({ __esModule: true, default: { subscribe: jest.fn() } }));
jest.mock('./game-state-sync-service', () => ({ __esModule: true, default: { set: jest.fn() } }));
jest.mock('./ready-state-sync-service', () => ({ __esModule: true, default: { set: jest.fn() } }));
jest.mock('./play-header-menu', () => ({ __esModule: true, default: () => <div>Game menu</div> }));
jest.mock('./play-header-messages', () => ({
  __esModule: true, default: ({ playerId }: { playerId: string }) => <div>Messages for {playerId}</div>,
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
    let resolve!: (value: Awaited<ReturnType<typeof getGameState>>) => void;
    jest.mocked(getGameState).mockReturnValue(new Promise(done => { resolve = done; }));
    await mount();
    expect(screen.getByRole('heading', { name: 'TableRunner' })).toBeInTheDocument();
    await act(async () => resolve({ success: false }));
    expect(screen.getByRole('heading', { name: 'TableRunner' })).toBeInTheDocument();
    expect(gameStateSyncService.set).toHaveBeenCalledWith('board', 'map', undefined);
  });

  it('loads, synchronizes and refreshes game and ready state from their topics', async () => {
    await mount();
    expect(getGameState).toHaveBeenCalledWith('board', 'map');
    expect(getPlayerReadyState).toHaveBeenCalledWith('board', 'map');
    expect(GameTopicService.subscribe).toHaveBeenCalledWith('board-map', expect.any(Function));
    expect(PlayerReadyTopicService.subscribe).toHaveBeenCalledWith('board-map', expect.any(Function));
    expect(gameStateSyncService.set).toHaveBeenCalledWith('board', 'map', game);
    expect(readyStateSyncService.set).toHaveBeenCalledWith('board', 'map', { readyPlayerIds: ['mage'] });
    expect(screen.getByText('check')).toBeInTheDocument();
    expect(screen.getByText('skull')).toBeInTheDocument();
    expect(screen.getByText('Messages for warrior')).toBeInTheDocument();
    const updated = makeGameState({ ...game, turn: 2 });
    jest.mocked(getGameState).mockResolvedValue({ success: true, data: updated });
    await act(async () => gameChanged());
    expect(gameStateSyncService.set).toHaveBeenLastCalledWith('board', 'map', updated);
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

  it('hides add at capacity and hides player-specific messages on the list page', async () => {
    jest.mocked(getGameState).mockResolvedValue({ success: true, data: makeGameState({
      characters: ['warrior', 'mage', 'rogue', 'cleric'].map(makeCharacter),
      players: ['warrior', 'mage', 'rogue', 'cleric'].map(id => makePlayer({ id })),
    }) });
    const view = await mount();
    expect(screen.queryByRole('button', { name: 'add' })).not.toBeInTheDocument();
    jest.mocked(useParams).mockReturnValue({});
    view.rerender(<PlayHeader boardId="board" mapId="map" />);
    expect(screen.queryByText(/Messages for/)).not.toBeInTheDocument();
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
    jest.mocked(getGameState).mockResolvedValue({ success: true, data: makeGameState({ players: [makePlayer()] }) });
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
