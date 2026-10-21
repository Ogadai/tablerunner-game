import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { warlordAllocateCoins } from '@/lib/runner/warlords-of-fire/server-actions';
import { DEFAULT_TEAM_STATE, saveState } from '@/lib/runner/warlords-of-fire/territory-state';
import { PlayerInventoryState } from '@/lib/store/types';
import sync from '../player-stats-sync.service';
import { makeGameState, makePlayer } from '../test-fixtures';
import WarlordCoins from './warlord-coins';

jest.mock('@/lib/runner/warlords-of-fire/server-actions', () => ({ warlordAllocateCoins: jest.fn() }));

beforeEach(() => {
  jest.mocked(warlordAllocateCoins).mockReset();
});

function pendingSave() {
  let resolve!: (result: Awaited<ReturnType<typeof warlordAllocateCoins>>) => void;
  const promise = new Promise<Awaited<ReturnType<typeof warlordAllocateCoins>>>(done => { resolve = done; });
  return { promise, resolve };
}

function setup(inventory: PlayerInventoryState = { equipment: null, equipped: null }) {
  const player = makePlayer({ coins: 120 });
  const gameState = makeGameState({ gameId: 'warlordsfire', players: [player] });
  saveState(gameState, { teams: { [player.team!]: { ...DEFAULT_TEAM_STATE, coins: 80 } } });
  sync.updatePlayer(player, {
    inventory, actions: { actions: [] }, addedStats: { characterStats: null }, instructions: {},
  });
  return { boardId: 'board', mapId: 'map', player, gameState };
}

it('previews the split, saves on release and synchronizes both instances for deposits and withdrawals', async () => {
  const props = setup();
  render(<><WarlordCoins {...props} /><WarlordCoins {...props} showHint /></>);
  await act(async () => {});
  const [slider, otherSlider] = screen.getAllByRole('slider');
  jest.mocked(warlordAllocateCoins).mockResolvedValueOnce({
    success: true, data: { equipment: null, equipped: null, coins: 60, teamCoinTransfer: 60 },
  });
  fireEvent.change(slider, { target: { value: '140' } });
  expect(slider).toHaveAttribute('aria-valuetext', '60 personal coins, 140 team coins');
  expect(warlordAllocateCoins).not.toHaveBeenCalled();
  fireEvent.pointerUp(slider);
  await waitFor(() => expect(otherSlider).toHaveValue('140'));
  expect(warlordAllocateCoins).toHaveBeenLastCalledWith('board', 'map', props.player.id, 140);
  expect(screen.getAllByLabelText('Personal coins: 60')).toHaveLength(2);
  expect(screen.getAllByLabelText('Team coins: 140')).toHaveLength(2);
  expect(screen.getAllByText('Team coins fund sub-commanders.')).toHaveLength(1);

  jest.mocked(warlordAllocateCoins).mockResolvedValueOnce({
    success: true, data: { equipment: null, equipped: null, coins: 160, teamCoinTransfer: -40 },
  });
  fireEvent.change(otherSlider, { target: { value: '40' } });
  fireEvent.keyUp(otherSlider, { key: 'ArrowLeft' });
  await waitFor(() => expect(slider).toHaveValue('40'));
  expect(screen.getAllByLabelText('Personal coins: 160')).toHaveLength(2);
  expect(screen.getAllByLabelText('Team coins: 40')).toHaveLength(2);
});

it('loads pending balances on mount and restores them if saving fails', async () => {
  const props = setup({ equipment: null, equipped: null, coins: 60, teamCoinTransfer: 60 });
  render(<WarlordCoins {...props} />);
  const slider = screen.getByRole('slider');
  await waitFor(() => expect(slider).toHaveValue('140'));
  jest.mocked(warlordAllocateCoins).mockResolvedValueOnce({ success: false, error: 'Save failed' });
  fireEvent.change(slider, { target: { value: '200' } });
  fireEvent.blur(slider);
  expect(await screen.findByRole('alert')).toHaveTextContent('Save failed');
  await waitFor(() => expect(slider).toHaveValue('140'));
});

it('queues a return to the original split without blocking the slider or duplicating release events', async () => {
  const props = setup();
  const first = pendingSave();
  const second = pendingSave();
  jest.mocked(warlordAllocateCoins).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  render(<WarlordCoins {...props} />);
  await act(async () => {});
  const slider = screen.getByRole('slider');

  fireEvent.change(slider, { target: { value: '140' } });
  fireEvent.pointerUp(slider);
  fireEvent.blur(slider);
  fireEvent.keyUp(slider);
  expect(warlordAllocateCoins).toHaveBeenCalledTimes(1);
  expect(slider).toBeEnabled();
  expect(slider).toHaveValue('140');

  fireEvent.change(slider, { target: { value: '80' } });
  fireEvent.pointerUp(slider);
  expect(slider).toHaveAttribute('aria-valuetext', '120 personal coins, 80 team coins');
  expect(warlordAllocateCoins).toHaveBeenCalledTimes(1);

  await act(async () => first.resolve({
    success: true, data: { equipment: null, equipped: null, coins: 60, teamCoinTransfer: 60 },
  }));
  expect(warlordAllocateCoins).toHaveBeenNthCalledWith(2, 'board', 'map', props.player.id, 80);
  expect(slider).toHaveValue('80');

  await act(async () => second.resolve({
    success: true, data: { equipment: null, equipped: null, coins: 120, teamCoinTransfer: 0 },
  }));
  await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  expect(slider).toHaveValue('80');
});

it('preserves an unfinished drag when an earlier allocation finishes saving', async () => {
  const props = setup();
  const first = pendingSave();
  jest.mocked(warlordAllocateCoins).mockReturnValueOnce(first.promise).mockResolvedValueOnce({
    success: true, data: { equipment: null, equipped: null, coins: 30, teamCoinTransfer: 90 },
  });
  render(<WarlordCoins {...props} />);
  await act(async () => {});
  const slider = screen.getByRole('slider');
  fireEvent.change(slider, { target: { value: '140' } });
  fireEvent.pointerUp(slider);
  fireEvent.change(slider, { target: { value: '170' } });

  await act(async () => first.resolve({
    success: true, data: { equipment: null, equipped: null, coins: 60, teamCoinTransfer: 60 },
  }));
  expect(slider).toHaveAttribute('aria-valuetext', '30 personal coins, 170 team coins');
  expect(warlordAllocateCoins).toHaveBeenCalledTimes(1);
  fireEvent.keyUp(slider);
  await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  expect(warlordAllocateCoins).toHaveBeenLastCalledWith('board', 'map', props.player.id, 170);
  expect(slider).toHaveValue('170');
});

it.each(['response', 'network'])('restores the last saved allocation when a queued save fails (%s)', async failure => {
  const props = setup();
  const first = pendingSave();
  jest.mocked(warlordAllocateCoins).mockReturnValueOnce(first.promise);
  if (failure === 'network') jest.mocked(warlordAllocateCoins).mockRejectedValueOnce(new Error('Save failed'));
  else jest.mocked(warlordAllocateCoins).mockResolvedValueOnce({ success: false, error: 'Save failed' });
  render(<WarlordCoins {...props} />);
  await act(async () => {});
  const slider = screen.getByRole('slider');
  fireEvent.change(slider, { target: { value: '140' } });
  fireEvent.pointerUp(slider);
  fireEvent.change(slider, { target: { value: '200' } });
  fireEvent.pointerUp(slider);
  expect(slider).toHaveValue('200');

  await act(async () => first.resolve({
    success: true, data: { equipment: null, equipped: null, coins: 60, teamCoinTransfer: 60 },
  }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Save failed');
  expect(slider).toHaveAttribute('aria-valuetext', '60 personal coins, 140 team coins');
  expect(warlordAllocateCoins).toHaveBeenCalledTimes(2);
});

it('continues saving a newer allocation after an earlier failure', async () => {
  const props = setup();
  const first = pendingSave();
  jest.mocked(warlordAllocateCoins).mockReturnValueOnce(first.promise).mockResolvedValueOnce({
    success: true, data: { equipment: null, equipped: null, coins: 160, teamCoinTransfer: -40 },
  });
  render(<WarlordCoins {...props} />);
  await act(async () => {});
  const slider = screen.getByRole('slider');
  fireEvent.change(slider, { target: { value: '140' } });
  fireEvent.pointerUp(slider);
  fireEvent.change(slider, { target: { value: '40' } });
  fireEvent.pointerUp(slider);

  await act(async () => first.resolve({ success: false, error: 'First save failed' }));
  await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  expect(slider).toHaveValue('40');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(warlordAllocateCoins).toHaveBeenCalledTimes(2);
});

it('skips old queued allocations and inventory responses after a turn change', async () => {
  const props = setup();
  const first = pendingSave();
  jest.mocked(warlordAllocateCoins).mockReturnValueOnce(first.promise).mockResolvedValueOnce({
    success: true, data: { equipment: null, equipped: null, coins: 160, teamCoinTransfer: -40 },
  });
  const view = render(<WarlordCoins {...props} />);
  await act(async () => {});
  const slider = screen.getByRole('slider');
  fireEvent.change(slider, { target: { value: '140' } });
  fireEvent.pointerUp(slider);
  fireEvent.change(slider, { target: { value: '170' } });
  fireEvent.pointerUp(slider);

  view.rerender(<WarlordCoins {...props} gameState={{ ...props.gameState, turn: props.gameState.turn + 1 }} />);
  expect(slider).toHaveValue('80');
  fireEvent.change(slider, { target: { value: '40' } });
  fireEvent.pointerUp(slider);
  await act(async () => first.resolve({
    success: true, data: { equipment: null, equipped: null, coins: 60, teamCoinTransfer: 60 },
  }));
  await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  expect(warlordAllocateCoins).toHaveBeenCalledTimes(2);
  expect(slider).toHaveValue('40');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('keeps the inventory synchronized if the popup closes before saving completes', async () => {
  const props = setup();
  let resolveSave!: (result: Awaited<ReturnType<typeof warlordAllocateCoins>>) => void;
  jest.mocked(warlordAllocateCoins).mockReturnValueOnce(new Promise(resolve => { resolveSave = resolve; }));
  const { unmount } = render(<WarlordCoins {...props} />);
  await act(async () => {});
  const slider = screen.getByRole('slider');
  fireEvent.change(slider, { target: { value: '140' } });
  fireEvent.pointerUp(slider);
  unmount();
  await act(async () => {
    resolveSave({ success: true, data: { equipment: null, equipped: null, coins: 60, teamCoinTransfer: 60 } });
  });
  render(<WarlordCoins {...props} />);
  await waitFor(() => expect(screen.getByRole('slider')).toHaveValue('140'));
});

it.each([{ processing: true }, { player: makePlayer({ health: 0 }) }])('disables allocation when unavailable (%o)', async overrides => {
  render(<WarlordCoins {...setup()} {...overrides} />);
  await act(async () => {});
  expect(screen.getByRole('slider')).toBeDisabled();
});

it('shows another player\'s pending balances without an allocation control', () => {
  render(<WarlordCoins {...setup()} isSelf={false}
    inventory={{ equipment: null, equipped: null, coins: 60, teamCoinTransfer: 60 }} />);
  expect(screen.getByLabelText('Personal coins: 60')).toBeInTheDocument();
  expect(screen.getByLabelText('Team coins: 140')).toBeInTheDocument();
  expect(screen.queryByRole('slider')).not.toBeInTheDocument();
});
