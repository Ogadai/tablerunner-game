import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { warlordAllocateCoins } from '@/lib/runner/warlords-of-fire/server-actions';
import { DEFAULT_TEAM_STATE, saveState } from '@/lib/runner/warlords-of-fire/territory-state';
import { PlayerInventoryState } from '@/lib/store/types';
import sync from '../player-stats-sync.service';
import { makeGameState, makePlayer } from '../test-fixtures';
import WarlordCoins from './warlord-coins';

jest.mock('@/lib/runner/warlords-of-fire/server-actions', () => ({ warlordAllocateCoins: jest.fn() }));

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
