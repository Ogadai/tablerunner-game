import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { createPlayerForGame, deletePlayerFromGame } from '@/lib/store/gameState';
import PlayGame from './play-game';
import { makeGameState, makePlayer } from './test-fixtures';

jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('sweetalert2', () => ({ __esModule: true, default: { fire: jest.fn() } }));
jest.mock('@/app/swal', () => ({ getSwalDefaultOptions: () => ({}) }));
jest.mock('@/lib/store/gameState', () => ({ createPlayerForGame: jest.fn(), deletePlayerFromGame: jest.fn() }));

describe('PlayGame', () => {
  const push = jest.fn();
  const gameState = makeGameState({ players: [makePlayer()] });
  const renderGame = () => render(<PlayGame boardId="board" mapId="map" name="Test" gameState={gameState} />);

  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
  });
  afterEach(() => jest.useRealTimers());

  it('offers play/delete for existing characters and create for unused characters', () => {
    renderGame();
    const existing = within(screen.getByText('Test Warrior').closest('li')!);
    expect(existing.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    expect(existing.getByRole('button', { name: 'delete_forever' })).toBeInTheDocument();
    expect(existing.queryByRole('button', { name: 'Create' })).not.toBeInTheDocument();
    const available = within(screen.getByText('Create mage').closest('li')!);
    expect(available.getByText('mage description')).toBeInTheDocument();
    expect(available.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('navigates to an existing player without creating another', () => {
    renderGame();
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(push).toHaveBeenCalledWith('/board/map/warrior');
    expect(createPlayerForGame).not.toHaveBeenCalled();
  });

  it('waits for creation and the synchronization delay before navigating', async () => {
    let finishCreation!: (value: Awaited<ReturnType<typeof createPlayerForGame>>) => void;
    jest.mocked(createPlayerForGame).mockReturnValue(new Promise(resolve => { finishCreation = resolve; }));
    renderGame();
    await act(async () => fireEvent.submit(screen.getByRole('button', { name: 'Create' }).closest('form')!));
    expect(createPlayerForGame).toHaveBeenCalledWith('board', 'map', 'mage');
    await act(async () => { await jest.advanceTimersByTimeAsync(1000); });
    expect(push).not.toHaveBeenCalled();
    await act(async () => finishCreation({ success: true }));
    await act(async () => { await jest.advanceTimersByTimeAsync(499); });
    expect(push).not.toHaveBeenCalled();
    await act(async () => { await jest.advanceTimersByTimeAsync(1); });
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/board/map/mage');
  });

  it.each([true, false])('deletes a player only when confirmed (%s)', async isConfirmed => {
    jest.mocked(Swal.fire).mockResolvedValue({ isConfirmed, isDenied: false, isDismissed: !isConfirmed });
    renderGame();
    await act(async () => fireEvent.submit(screen.getByRole('button', { name: 'delete_forever' }).closest('form')!));
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: 'Delete player?', showCancelButton: true }));
    if (isConfirmed) expect(deletePlayerFromGame).toHaveBeenCalledWith('board', 'map', 'warrior');
    else expect(deletePlayerFromGame).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
