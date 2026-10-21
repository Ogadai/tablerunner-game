import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { takeItemAtLocation } from '@/lib/store/playerInventory';
import PlayerLocation from './player-location';
import { makeGameState, makePlayer } from './test-fixtures';
import { makePlayerSnapshot } from '../game/test-fixtures';

jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('@/lib/store/playerInventory', () => ({ takeItemAtLocation: jest.fn() }));
jest.mock('@/lib/store/playerActionsState', () => ({}));
jest.mock('@/lib/store/locationState', () => ({}));
jest.mock('./character-stats', () => ({ __esModule: true, default: () => <p>Player stats</p> }));
jest.mock('./player-spells', () => ({ __esModule: true, default: () => null }));
jest.mock('./player-store', () => ({ __esModule: true, default: () => null }));
jest.mock('./player-portal', () => ({ __esModule: true, default: () => null }));
jest.mock('./fast-travel', () => ({ __esModule: true, default: () => null }));
jest.mock('./player-video', () => ({ __esModule: true, default: () => null }));
jest.mock('./warlords-of-fire/warlord-recruitment', () => ({ __esModule: true, default: () => null }));
jest.mock('./warlords-of-fire/warlord-party', () => ({ __esModule: true, default: () => null }));

function pendingPickup() {
  let resolve!: (result: Awaited<ReturnType<typeof takeItemAtLocation>>) => void;
  const promise = new Promise<Awaited<ReturnType<typeof takeItemAtLocation>>>(done => { resolve = done; });
  return { promise, resolve };
}

it('updates an open inventory as queued loot pickups finish', async () => {
  jest.mocked(useRouter).mockReturnValue({ push: jest.fn() } as unknown as ReturnType<typeof useRouter>);
  const player = makePlayer({ id: 'barbarian' });
  const gameState = makeGameState({ players: [player] });
  const items = [
    { id: 'sword', type: 'swordRusty' },
    { id: 'steel', type: 'swordSteel' },
    { id: 'potion', type: 'healingPotion' },
  ];
  const pickups = items.map(() => pendingPickup());
  for (const pickup of pickups) jest.mocked(takeItemAtLocation).mockReturnValueOnce(pickup.promise);
  const snapshot = makePlayerSnapshot({ playerId: player.id, gameState,
    location: { monsters: [], npcs: [], items } });
  await act(async () => {
    render(<PlayerLocation boardId="board" mapId="map" gameState={gameState} snapshot={snapshot}
      playerId={player.id} isPlayerReady={false} processing={false} endTurnAction={jest.fn()} />);
  });

  fireEvent.click(screen.getByRole('button', { name: 'Rusty Sword' }));
  fireEvent.click(screen.getByRole('button', { name: 'Steel Sword' }));
  fireEvent.click(screen.getByRole('button', { name: 'Minor Healing Potion' }));
  fireEvent.click(screen.getByRole('listitem', { name: player.name }));
  fireEvent.click(screen.getByRole('tab', { name: 'Inventory' }));
  const inventory = within(screen.getByRole('tabpanel', { name: 'Inventory' }));

  await act(async () => pickups[0].resolve({ success: true, data: { equipment: items.slice(0, 1), equipped: {} } }));
  expect(inventory.getByRole('button', { name: 'Rusty Sword' })).toBeInTheDocument();
  expect(inventory.queryByRole('button', { name: 'Steel Sword' })).not.toBeInTheDocument();

  await act(async () => pickups[1].resolve({ success: true, data: { equipment: items.slice(0, 2), equipped: {} } }));
  expect(inventory.getByRole('button', { name: 'Steel Sword' })).toBeInTheDocument();

  await act(async () => pickups[2].resolve({ success: true, data: { equipment: items, equipped: {} } }));
  expect(inventory.getByRole('button', { name: 'Minor Healing Potion' })).toBeInTheDocument();
  expect(inventory.getAllByRole('button')).toHaveLength(3);
  expect(screen.getByRole('tab', { name: 'Inventory' })).toHaveAttribute('aria-selected', 'true');
  expect(takeItemAtLocation).toHaveBeenCalledTimes(3);
});
