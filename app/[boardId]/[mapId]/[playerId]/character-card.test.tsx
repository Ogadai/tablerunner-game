import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { dropItemAtLocation, getPlayerInventory, giveItemToNpc, playerEquipItem, takeItemFromNpc } from '@/lib/store/playerInventory';
import CharacterCard from './character-card';
import sync from './player-stats-sync.service';
import { makeNpc, makePlayer, makeStats } from './test-fixtures';

jest.mock('./character-stats', () => ({ __esModule: true, default: () => <p>Player stats</p> }));
jest.mock('./npc-card', () => ({ __esModule: true, default: () => <p>NPC stats</p> }));
jest.mock('@/lib/store/playerInventory', () => ({
  playerEquipItem: jest.fn(), dropItemAtLocation: jest.fn(), getPlayerInventory: jest.fn(),
  giveItemToNpc: jest.fn(), takeItemFromNpc: jest.fn(),
}));
jest.mock('./player-stats-sync.service', () => ({ __esModule: true, default: { updateInventory: jest.fn() } }));

describe('CharacterCard', () => {
  beforeEach(() => {
    jest.mocked(getPlayerInventory).mockResolvedValue({ success: true, data: { equipment: null, equipped: null } });
  });
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

  it('shows NPC stats for a non-player character', async () => {
    render(<CharacterCard boardId="board" mapId="map" player={makeNpc()} viewer={makePlayer()} isSelf={false}
      actionPointsLeft={20} playerStats={null} onUseItem={jest.fn()} onLearnScroll={jest.fn()}
      usedItemIds={[]} onHired={jest.fn()} />);
    expect(screen.getByText('NPC stats')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it('shows pending inventory for another player, including an empty replacement list', async () => {
    jest.mocked(getPlayerInventory).mockResolvedValue({ success: true, data: { equipment: [], equipped: {} } });
    render(<CharacterCard boardId="board" mapId="map"
      player={makePlayer({ id: 'other', equipment: [{ id: 'old', type: 'swordRusty' }] })}
      viewer={makePlayer()} isSelf={false} actionPointsLeft={20} playerStats={null}
      onUseItem={jest.fn()} onLearnScroll={jest.fn()} usedItemIds={[]} onHired={jest.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Inventory' }));
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    expect(getPlayerInventory).toHaveBeenCalledWith('board', 'map', 'other');
    expect(screen.queryByRole('button', { name: 'Rusty Sword' })).not.toBeInTheDocument();
    expect(sync.updateInventory).not.toHaveBeenCalled();
  });

  it('takes an NPC item and refreshes both inventories without closing the card', async () => {
    const item = { id: 'steel', type: 'swordSteel' };
    jest.mocked(getPlayerInventory).mockResolvedValue({ success: true, data: { equipment: [item], equipped: { weapon: item.id } } });
    const playerInventory = { equipment: [item], equipped: {} };
    jest.mocked(takeItemFromNpc).mockResolvedValue({ success: true, data: {
      playerInventory, npcInventory: { equipment: [], equipped: {} },
    } });
    render(<CharacterCard boardId="board" mapId="map" player={makeNpc({ masterId: 'warrior' })}
      viewer={makePlayer()} isSelf={false} actionPointsLeft={20} playerStats={null}
      onUseItem={jest.fn()} onLearnScroll={jest.fn()} usedItemIds={[]} onHired={jest.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Inventory' }));
    const button = await screen.findByRole('button', { name: 'Steel Sword' });
    fireEvent.click(button);
    fireEvent.click(screen.getByRole('button', { name: 'Take' }));
    await waitFor(() => expect(sync.updateInventory).toHaveBeenCalledWith(playerInventory));
    expect(takeItemFromNpc).toHaveBeenCalledWith('board', 'map', 'warrior', 'npc-1', 'steel');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Steel Sword' })).not.toBeInTheDocument());
  });

  it.each(['click', 'Enter', ' '] as const)('lets the player select a follower icon with %s to receive an item', async interaction => {
    const player = makePlayer({ equipment: [{ id: 'sword', type: 'swordRusty' }] });
    const followers = [
      makeNpc({ masterId: player.id }),
      makeNpc({ id: 'npc-2', name: 'Archer', masterId: player.id, iconXY: { x: 2, y: 1 } }),
    ];
    const playerInventory = { equipment: [], equipped: {} };
    jest.mocked(giveItemToNpc).mockResolvedValue({ success: true, data: {
      playerInventory, npcInventory: { equipment: player.equipment, equipped: { weapon: 'sword' } },
    } });
    render(<CharacterCard boardId="board" mapId="map" player={player} viewer={player} isSelf
      followerNPCs={followers} actionPointsLeft={20} playerStats={makeStats()}
      onUseItem={jest.fn()} onLearnScroll={jest.fn()} usedItemIds={[]} onHired={jest.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Inventory' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rusty Sword' }));
    fireEvent.click(screen.getByRole('button', { name: 'Give' }));
    const picker = within(await screen.findByRole('dialog', { name: 'Give Rusty Sword' }));
    expect(picker.getAllByRole('listitem')).toHaveLength(2);
    for (const follower of followers) {
      expect(picker.getByRole('listitem', { name: follower.name })).toHaveAttribute('title', follower.name);
      expect(picker.queryByText(follower.name)).not.toBeInTheDocument();
    }
    const followerIcon = picker.getByRole('listitem', { name: 'Archer' });
    expect(followerIcon.querySelector('.entityIcon')).toHaveStyle({ backgroundPosition: '-100px -80px' });
    expect(giveItemToNpc).not.toHaveBeenCalled();
    if (interaction === 'click') fireEvent.click(followerIcon);
    else fireEvent.keyDown(followerIcon, { key: interaction });
    await waitFor(() => expect(sync.updateInventory).toHaveBeenCalledWith(playerInventory));
    expect(giveItemToNpc).toHaveBeenCalledTimes(1);
    expect(giveItemToNpc).toHaveBeenCalledWith('board', 'map', 'warrior', 'npc-2', 'sword');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
