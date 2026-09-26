import type { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { getPlayerMessages } from '@/lib/store/playerMessages';
import PlayHeaderMessages from './play-header-messages';
import { makeGameState } from './test-fixtures';

jest.mock('@/lib/store/playerMessages', () => ({ getPlayerMessages: jest.fn() }));
// Markdown is ESM-only; keep these tests focused on fetching and displaying messages.
jest.mock('react-markdown', () => ({ __esModule: true, default: ({ children }: { children: ReactNode }) => <p>{children}</p> }));

describe('PlayHeaderMessages', () => {
  const originalResizeObserver = global.ResizeObserver;
  beforeAll(() => {
    // Radix observes popup dimensions; jsdom does not implement layout observers.
    global.ResizeObserver = jest.fn().mockImplementation(() => ({ observe: jest.fn(), unobserve: jest.fn(), disconnect: jest.fn() }));
  });
  afterAll(() => { global.ResizeObserver = originalResizeObserver; });
  const game = makeGameState();
  const mount = async () => {
    let view!: ReturnType<typeof render>;
    await act(async () => { view = render(<PlayHeaderMessages boardId="board" mapId="map" playerId="warrior" gameState={game} />); });
    return view;
  };
  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(getPlayerMessages).mockResolvedValue({ success: true, data: { messages: [{ text: 'A dragon approaches' }, { text: 'You gained a level' }] } });
  });
  afterEach(() => jest.useRealTimers());

  it.each([{ success: true, data: { messages: [] } }, { success: false }])('hides the trigger when there are no messages: %j', async result => {
    jest.mocked(getPlayerMessages).mockResolvedValue(result);
    await mount();
    expect(getPlayerMessages).toHaveBeenCalledWith('board', 'map', 'warrior');
    expect(screen.queryByRole('button', { name: 'mail' })).not.toBeInTheDocument();
  });

  it('opens messages after 500ms and supports closing and reopening', async () => {
    await mount();
    expect(screen.getByRole('button', { name: 'mail' })).toBeInTheDocument();
    await act(async () => { await jest.advanceTimersByTimeAsync(499); });
    expect(screen.queryByText('A dragon approaches')).not.toBeInTheDocument();
    await act(async () => { await jest.advanceTimersByTimeAsync(1); });
    expect(screen.getByText('A dragon approaches')).toBeInTheDocument();
    expect(screen.getByText('You gained a level')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByText('A dragon approaches')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'mail' }));
    expect(screen.getByText('A dragon approaches')).toBeInTheDocument();
  });

  it('refreshes messages when the game state or selected player changes', async () => {
    const view = await mount();
    jest.mocked(getPlayerMessages).mockResolvedValue({ success: true, data: { messages: [{ text: 'Next turn' }] } });
    const nextGame = makeGameState({ turn: 2 });
    await act(async () => view.rerender(<PlayHeaderMessages boardId="board" mapId="map" playerId="warrior" gameState={nextGame} />));
    expect(getPlayerMessages).toHaveBeenCalledTimes(2);
    await act(async () => { await jest.advanceTimersByTimeAsync(500); });
    expect(screen.getByText('Next turn')).toBeInTheDocument();
    expect(screen.queryByText('A dragon approaches')).not.toBeInTheDocument();
    jest.mocked(getPlayerMessages).mockResolvedValue({ success: true, data: { messages: [] } });
    await act(async () => view.rerender(<PlayHeaderMessages boardId="board" mapId="map" playerId="mage" gameState={nextGame} />));
    expect(getPlayerMessages).toHaveBeenLastCalledWith('board', 'map', 'mage');
    expect(screen.queryByRole('button', { name: 'mail' })).not.toBeInTheDocument();
    expect(screen.queryByText('Next turn')).not.toBeInTheDocument();
  });
});
