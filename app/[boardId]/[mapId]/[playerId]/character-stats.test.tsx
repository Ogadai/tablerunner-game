import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { setPlayerAddStatsState } from '@/lib/store/playerStatsState';
import type { PlayerAddStatsState } from '@/lib/store/types';
import CharacterStats from './character-stats';
import sync from './player-stats-sync.service';
import { makeGameState, makePlayer, makeStats } from './test-fixtures';
import WarlordCoins from './warlords-of-fire/warlord-coins';

jest.mock('@/lib/store/playerStatsState', () => ({ setPlayerAddStatsState: jest.fn() }));
jest.mock('./warlords-of-fire/warlord-coins', () => ({ __esModule: true, default: jest.fn(() => <p>Team coins</p>) }));
jest.mock('./player-stats-sync.service', () => ({ __esModule: true, default: {
  subscribe: jest.fn(), getAddStateState: jest.fn(), updateAddStatsState: jest.fn(),
} }));

describe('CharacterStats', () => {
  const empty = { strength: 0, skill: 0, intelligence: 0, reactions: 0, resiliance: 0 };
  let listener: Parameters<typeof sync.subscribe>[0];
  let dispose: jest.Mock;

  beforeEach(() => {
    dispose = jest.fn();
    jest.mocked(sync.subscribe).mockImplementation(callback => { listener = callback; return dispose; });
    jest.mocked(sync.getAddStateState).mockResolvedValue({ characterStats: empty });
    jest.mocked(sync.updateAddStatsState).mockImplementation(state => listener(makeStats(), { actions: [] }, state, null));
    jest.mocked(setPlayerAddStatsState).mockResolvedValue({ success: true });
  });

  it('allocates and refunds points, synchronizing and persisting each change', async () => {
    render(<CharacterStats boardId="board" mapId="map" player={makePlayer({ availableStats: 1 })} playerStats={null} isSelf />);
    await act(async () => {});
    fireEvent.click(screen.getByRole('button', { name: 'Increase Strength' }));
    const allocated: PlayerAddStatsState = { characterStats: { ...empty, strength: 1 } };
    expect(sync.updateAddStatsState).toHaveBeenCalledWith(allocated);
    expect(setPlayerAddStatsState).toHaveBeenCalledWith('board', 'map', 'warrior', allocated);
    expect(screen.queryByRole('button', { name: 'Increase Skill' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Decrease Strength' }));
    expect(setPlayerAddStatsState).toHaveBeenLastCalledWith('board', 'map', 'warrior', { characterStats: empty });
    expect(screen.getByRole('button', { name: 'Increase Skill' })).toBeVisible();
  });

  it('loads pending allocations, reacts to resets and unsubscribes', async () => {
    jest.mocked(sync.getAddStateState).mockResolvedValue({ characterStats: { ...empty, skill: 1 } });
    const { unmount } = render(<CharacterStats boardId="board" mapId="map"
      player={makePlayer({ availableStats: 1 })} playerStats={makeStats()} isSelf />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Decrease Skill' })).toBeVisible());
    act(() => listener(makeStats(), { actions: [] }, null, null));
    expect(screen.getByRole('button', { name: 'Increase Skill' })).toBeVisible();
    unmount();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it.each([{ isSelf: false, health: 10 }, { isSelf: true, health: 0 }])(
    'does not offer point increases with %o', async ({ isSelf, health }) => {
      render(<CharacterStats boardId="board" mapId="map" player={makePlayer({ health, availableStats: 3 })}
        playerStats={null} isSelf={isSelf} />);
      await act(async () => {});
      expect(screen.queryByRole('button', { name: /Increase/ })).not.toBeInTheDocument();
    },
  );

  it.each(['warlordsfire', 'racefire'])('uses the shared allocation display only for Warlords (%s)', async gameId => {
    const player = makePlayer();
    const gameState = makeGameState({ gameId, players: [player] });
    render(<CharacterStats boardId="board" mapId="map" player={player} playerStats={null} isSelf gameState={gameState} />);
    await act(async () => {});
    if (gameId === 'warlordsfire') {
      expect(jest.mocked(WarlordCoins).mock.calls.at(-1)?.[0]).toMatchObject({ player, gameState, isSelf: true });
      expect(screen.queryByAltText('Coins')).not.toBeInTheDocument();
    } else {
      expect(WarlordCoins).not.toHaveBeenCalled();
      expect(screen.getByAltText('Coins')).toBeInTheDocument();
    }
  });
});
