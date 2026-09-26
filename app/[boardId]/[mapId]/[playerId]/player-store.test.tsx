import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { buyAndSellInStore, getStoreInventoryState } from '@/lib/store/playerInventory';
import PlayerStore from './player-store';
import sync from './player-stats-sync.service';
import { makePlayer } from './test-fixtures';

jest.mock('@/lib/store/playerInventory', () => ({ buyAndSellInStore: jest.fn(), getStoreInventoryState: jest.fn() }));
jest.mock('./player-stats-sync.service', () => ({ __esModule: true, default: { updateInventory: jest.fn() } }));

describe('PlayerStore', () => {
  beforeEach(() => {
    jest.mocked(getStoreInventoryState).mockResolvedValue({ success: true, data: { items: [{ itemId: 'swordRusty', count: 1 }] } });
    jest.mocked(buyAndSellInStore).mockResolvedValue({ success: true, data: { equipment: [], equipped: {}, coins: 10 } });
  });

  it.each(['Buy', 'Sell'] as const)('submits a %s transaction and refreshes player inventory', async tab => {
    render(<PlayerStore boardId="board" mapId="map" player={makePlayer({ coins: 20,
      equipment: [{ id: 'owned-sword', type: 'swordRusty' }] })} usedItemIds={[]} />);
    expect(getStoreInventoryState).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Shop' }));
    await screen.findByRole('button', { name: 'Rusty Sword' });
    expect(getStoreInventoryState).toHaveBeenCalledWith('board', 'map', 1);
    fireEvent.click(screen.getByRole('tab', { name: tab }));
    fireEvent.click(screen.getByRole('button', { name: 'Rusty Sword' }));
    fireEvent.click(screen.getByRole('button', { name: tab }));
    await waitFor(() => expect(sync.updateInventory).toHaveBeenCalledWith({ equipment: [], equipped: {}, coins: 10 }));
    expect(buyAndSellInStore).toHaveBeenCalledWith('board', 'map', 'warrior', 1,
      tab === 'Buy' ? { buyItemTypes: ['swordRusty'], sellItemIds: [] }
        : { buyItemTypes: [], sellItemIds: ['owned-sword'] });
  });

  it('leaves inventory unchanged after a rejected purchase', async () => {
    jest.mocked(buyAndSellInStore).mockResolvedValue({ success: false, error: 'Sold out' });
    render(<PlayerStore boardId="board" mapId="map" player={makePlayer({ coins: 20 })} usedItemIds={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Shop' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Rusty Sword' }));
    fireEvent.click(screen.getByRole('button', { name: 'Buy' }));
    await waitFor(() => expect(buyAndSellInStore).toHaveBeenCalledTimes(1));
    expect(sync.updateInventory).not.toHaveBeenCalled();
  });
});
