import type { ComponentProps } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useParams, useRouter } from 'next/navigation';
import { setPlayerReady } from '@/lib/store/playerReadyState';
import processingService from '@/app/message-bus/game-processing-service';
import gameService from '../game/game-state-sync-service';
import readyService from '../game/ready-state-sync-service';
import PlayerLocation from './player-location';
import Page from './page';
import { makeGameState } from './test-fixtures';

jest.mock('next/navigation', () => ({ useParams: jest.fn(), useRouter: jest.fn() }));
jest.mock('@/lib/store/playerReadyState', () => ({ setPlayerReady: jest.fn() }));
jest.mock('@/app/message-bus/game-processing-service', () => ({ __esModule: true, default: { subscribe: jest.fn() } }));
jest.mock('../game/game-state-sync-service', () => ({ __esModule: true, default: { get: jest.fn(), subscribe: jest.fn() } }));
jest.mock('../game/ready-state-sync-service', () => ({ __esModule: true, default: { get: jest.fn(), subscribe: jest.fn() } }));
jest.mock('./player-location', () => ({ __esModule: true, default: jest.fn() }));

describe('Player page', () => {
  let onGame: Parameters<typeof gameService.subscribe>[2];
  let onProcessing: Parameters<typeof processingService.subscribe>[1];
  let onReady: Parameters<typeof readyService.subscribe>[2];
  const push = jest.fn();
  const disposeGame = jest.fn();
  const disposeProcessing = jest.fn();

  beforeEach(() => {
    jest.mocked(useParams).mockReturnValue({ boardId: 'board', mapId: 'map', playerId: 'warrior' });
    jest.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    jest.mocked(gameService.get).mockReturnValue(makeGameState());
    jest.mocked(readyService.get).mockReturnValue({ readyPlayerIds: [] });
    jest.mocked(gameService.subscribe).mockImplementation((_board, _map, callback) => { onGame = callback; return disposeGame; });
    jest.mocked(processingService.subscribe).mockImplementation((_topic, callback) => { onProcessing = callback; return disposeProcessing; });
    jest.mocked(readyService.subscribe).mockImplementation((_board, _map, callback) => { onReady = callback; return jest.fn(); });
    jest.mocked(setPlayerReady).mockResolvedValue({ success: true });
    jest.mocked(PlayerLocation).mockImplementation((props: ComponentProps<typeof PlayerLocation>) =>
      <button disabled={props.processing} onClick={() => props.endTurnAction('n')}>
        {props.isPlayerReady ? 'Cancel ready' : 'Submit turn'}
      </button>);
  });

  it('shows loading and redirects if the game disappears', () => {
    jest.mocked(gameService.get).mockReturnValue(undefined);
    render(<Page />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    act(() => onGame(undefined));
    expect(push).toHaveBeenCalledWith('/board/map');
  });

  it('submits the direction, disables while pending, and toggles ready state', async () => {
    let finish!: (value: { success: boolean }) => void;
    jest.mocked(setPlayerReady).mockReturnValue(new Promise(resolve => { finish = resolve; }));
    render(<Page />);
    fireEvent.click(screen.getByRole('button', { name: 'Submit turn' }));
    expect(screen.getByRole('button')).toBeDisabled();
    expect(setPlayerReady).toHaveBeenCalledWith('board', 'map', 'warrior', true, 'n');
    await act(async () => finish({ success: true }));
    act(() => onReady({ readyPlayerIds: ['warrior'] }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel ready' }));
    await waitFor(() => expect(setPlayerReady).toHaveBeenLastCalledWith('board', 'map', 'warrior', false, 'n'));
  });

  it.each(['response', 'exception'])('reports a submission %s failure and allows retry', async failure => {
    if (failure === 'response') jest.mocked(setPlayerReady).mockResolvedValue({ success: false, error: 'Turn rejected' });
    else jest.mocked(setPlayerReady).mockRejectedValue(new Error('offline'));
    render(<Page />);
    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByRole('alert')).toHaveTextContent(failure === 'response' ? 'Turn rejected' : 'Unable to submit the turn');
    expect(screen.getByRole('button')).toBeEnabled();
    jest.mocked(setPlayerReady).mockResolvedValue({ success: true });
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('tracks processing events and disposes game and processing subscriptions', () => {
    const { unmount } = render(<Page />);
    act(() => onProcessing(true));
    expect(screen.getByRole('button')).toBeDisabled();
    act(() => onProcessing(false));
    expect(screen.getByRole('alert')).toHaveTextContent('The turn failed');
    act(() => onProcessing(true));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    act(() => onGame(makeGameState({ turn: 2 })));
    expect(screen.getByRole('button')).toBeEnabled();
    unmount();
    expect(disposeGame).toHaveBeenCalledTimes(1);
    expect(disposeProcessing).toHaveBeenCalledTimes(1);
  });
});
