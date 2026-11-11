import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { buyAndSellInStore, getStoreInventoryState } from '@/lib/store/playerInventory';
import PlayerStore from './player-store';
import sync from './player-stats-sync.service';
import { makePlayer } from './test-fixtures';
import StoreTopicService from '@/app/message-bus/store-topic-service';
import { GameTopicMessageType } from '@/lib/message-types';

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

  it('updates an open shop from matching stock notifications without refetching', async () => {
    render(<PlayerStore boardId="board" mapId="map" player={makePlayer({ coins: 20 })} usedItemIds={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Shop' }));
    await screen.findByRole('button', { name: 'Rusty Sword' });
    const message = {
      type: GameTopicMessageType.StoreUpdated as const,
      locationId: 2,
      playerId: 'other-player',
      playerInventory: { equipment: [], equipped: {}, coins: 10 },
      storeInventory: { items: [{ itemId: 'swordRusty', count: 0 }] },
    };

    act(() => StoreTopicService.raiseStoreUpdated('board-map', message));
    expect(screen.getByRole('button', { name: 'Rusty Sword' })).toBeInTheDocument();
    act(() => StoreTopicService.raiseStoreUpdated('other-map', { ...message, locationId: 1 }));
    expect(screen.getByRole('button', { name: 'Rusty Sword' })).toBeInTheDocument();
    act(() => StoreTopicService.raiseStoreUpdated('board-map', { ...message, locationId: 1 }));
    expect(screen.queryByRole('button', { name: 'Rusty Sword' })).not.toBeInTheDocument();
    expect(getStoreInventoryState).toHaveBeenCalledTimes(1);
    expect(sync.updateInventory).not.toHaveBeenCalled();
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

  it('shows equipped stats comparison in both Buy and Sell shop tabs', async () => {
    jest.mocked(getStoreInventoryState).mockResolvedValue({
      success: true,
      data: { items: [{ itemId: 'swordInferno', count: 1 }] },
    });
    render(<PlayerStore
      boardId="board"
      mapId="map"
      player={makePlayer({
        coins: 300,
        equipment: [
          { id: 'steel-1', type: 'swordSteel' },
          { id: 'rusty-1', type: 'swordRusty' },
        ],
        equipped: { weapon: 'steel-1' },
      })}
      usedItemIds={[]}
    />);

    fireEvent.click(screen.getByRole('button', { name: 'Shop' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Inferno Sword' }));
    const headers = screen.getAllByRole('columnheader');
    expect(within(headers[0]).getByText('250')).toBeInTheDocument();
    expect(headers[1]).toHaveTextContent('Equipped');
    expect(headers[2]).toHaveTextContent('This Item');
    expect(screen.getAllByRole('row').slice(1).map(row =>
      within(row).getAllByRole('cell').map(cell => cell.textContent),
    )).toEqual([
      ['attack', '+2', '+10'],
      ['damage', '+2', '+12'],
      ['magic', '-', '+5'],
    ]);

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    fireEvent.click(screen.getByRole('tab', { name: 'Sell' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rusty Sword' }));
    expect(screen.getByRole('columnheader', { name: 'Equipped' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'This Item' })).toBeInTheDocument();
    expect(screen.getAllByRole('row').slice(1).map(row =>
      within(row).getAllByRole('cell').map(cell => cell.textContent),
    )).toEqual([
      ['attack', '+2', '+1'],
      ['damage', '+2', '+1'],
    ]);

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Steel Sword' }));
    expect(screen.queryByRole('columnheader', { name: 'Equipped' })).not.toBeInTheDocument();
  });
});
