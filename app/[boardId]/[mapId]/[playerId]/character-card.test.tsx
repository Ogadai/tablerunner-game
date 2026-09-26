import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { dropItemAtLocation, playerEquipItem } from '@/lib/store/playerInventory';
import CharacterCard from './character-card';
import sync from './player-stats-sync.service';
import { makeNpc, makePlayer, makeStats } from './test-fixtures';

jest.mock('./character-stats', () => ({ __esModule: true, default: () => <p>Player stats</p> }));
jest.mock('./npc-card', () => ({ __esModule: true, default: () => <p>NPC stats</p> }));
jest.mock('@/lib/store/playerInventory', () => ({ playerEquipItem: jest.fn(), dropItemAtLocation: jest.fn() }));
jest.mock('./player-stats-sync.service', () => ({ __esModule: true, default: { updateInventory: jest.fn() } }));

describe('CharacterCard', () => {
  it.each(['Equip', 'Drop'] as const)('persists %s for the displayed player and refreshes inventory', async action => {
    const data = { equipment: [], equipped: {} };
    jest.mocked(playerEquipItem).mockResolvedValue({ success: true, data });
    jest.mocked(dropItemAtLocation).mockResolvedValue({ success: true, data });
    const player = makePlayer({ equipment: [{ id: 'sword-1', type: 'swordRusty' }] });
    render(<CharacterCard boardId="board" mapId="map" player={player} viewer={player} isSelf
      actionPointsLeft={20} playerStats={makeStats()} onUseItem={jest.fn()} onLearnScroll={jest.fn()}
      usedItemIds={[]} onHired={jest.fn()} />);
    expect(screen.getByText('Player stats')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Inventory' }));
    expect(screen.getByRole('tab', { name: 'Inventory' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Rusty Sword' }));
    fireEvent.click(screen.getByRole('button', { name: action }));
    await waitFor(() => expect(sync.updateInventory).toHaveBeenCalledWith(data));
    expect(action === 'Equip' ? playerEquipItem : dropItemAtLocation).toHaveBeenCalledWith('board', 'map', 'warrior', 'sword-1');
  });

  it('shows NPC stats for a non-player character', () => {
    render(<CharacterCard boardId="board" mapId="map" player={makeNpc()} viewer={makePlayer()} isSelf={false}
      actionPointsLeft={20} playerStats={null} onUseItem={jest.fn()} onLearnScroll={jest.fn()}
      usedItemIds={[]} onHired={jest.fn()} />);
    expect(screen.getByText('NPC stats')).toBeInTheDocument();
  });
});
