import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { startTransition, StrictMode } from 'react';
import { dropItemAtLocation, getPlayerInventory, giveItemToNpc, playerEquipItem, takeItemFromNpc } from '@/lib/store/playerInventory';
import CharacterCard from './character-card';
import sync from './player-stats-sync.service';
import { makeGameState, makeNpc, makePlayer, makeStats } from './test-fixtures';

jest.mock('./character-stats', () => ({ __esModule: true, default: () => <p>Player stats</p> }));
jest.mock('./npc-card', () => ({ __esModule: true, default: () => <p>NPC stats</p> }));
jest.mock('@/lib/store/playerInventory', () => ({
  playerEquipItem: jest.fn(), dropItemAtLocation: jest.fn(), getPlayerInventory: jest.fn(),
  giveItemToNpc: jest.fn(), takeItemFromNpc: jest.fn(),
}));
jest.mock('./player-stats-sync.service', () => ({ __esModule: true, default: { updateInventory: jest.fn() } }));

async function renderCard(ui: Parameters<typeof render>[0]) {
  let result!: ReturnType<typeof render>;
  await act(async () => { result = render(ui); });
  return result;
}

function pendingTransfer() {
  let resolve!: (result: Awaited<ReturnType<typeof giveItemToNpc>>) => void;
  const promise = new Promise<Awaited<ReturnType<typeof giveItemToNpc>>>(done => { resolve = done; });
  return { promise, resolve };
}

function pendingInventory() {
  let resolve!: (result: Awaited<ReturnType<typeof getPlayerInventory>>) => void;
  const promise = new Promise<Awaited<ReturnType<typeof getPlayerInventory>>>(done => { resolve = done; });
  return { promise, resolve };
}

describe('CharacterCard', () => {
  beforeEach(() => {
    jest.mocked(getPlayerInventory).mockReset().mockResolvedValue({ success: true, data: { equipment: null, equipped: null } });
    jest.mocked(giveItemToNpc).mockReset();
    jest.mocked(takeItemFromNpc).mockReset();
  });
  it.each(['Equip', 'Drop'] as const)('persists %s for the displayed player and refreshes inventory', async action => {
    const data = { equipment: [], equipped: {} };
    jest.mocked(playerEquipItem).mockResolvedValue({ success: true, data });
    jest.mocked(dropItemAtLocation).mockResolvedValue({ success: true, data });
    const player = makePlayer({ equipment: [{ id: 'sword-1', type: 'swordRusty' }] });
    await renderCard(<CharacterCard boardId="board" mapId="map" player={player} viewer={player} isSelf
      actionPointsLeft={20} playerStats={makeStats()} onUseItem={jest.fn()} onLearnScroll={jest.fn()}
      usedItemIds={[]} onHired={jest.fn()} />);
    expect(screen.getByText('Player stats')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Inventory' }));
    expect(screen.getByRole('tab', { name: 'Inventory' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Rusty Sword' }));
    fireEvent.click(screen.getByRole('button', { name: action }));
    await waitFor(() => expect(sync.updateInventory).toHaveBeenCalledWith(data));
    expect(action === 'Equip' ? playerEquipItem : dropItemAtLocation).toHaveBeenCalledWith('board', 'map', 'warrior', 'sword-1');
    expect(getPlayerInventory).not.toHaveBeenCalled();
  });

  it('shows NPC stats for a non-player character', async () => {
    await renderCard(<CharacterCard boardId="board" mapId="map" player={makeNpc()} viewer={makePlayer()} isSelf={false}
      actionPointsLeft={20} playerStats={null} onUseItem={jest.fn()} onLearnScroll={jest.fn()}
      usedItemIds={[]} onHired={jest.fn()} />);
    expect(await screen.findByText('NPC stats')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it('keeps the tabs available while loading and reuses the request when switching tabs', async () => {
    const pending = pendingInventory();
    jest.mocked(getPlayerInventory).mockReturnValueOnce(pending.promise);
    await renderCard(<StrictMode><CharacterCard boardId="board" mapId="map"
      player={makeNpc({ equipment: [{ id: 'old', type: 'swordRusty' }] })}
      viewer={makePlayer()} isSelf={false} actionPointsLeft={20} playerStats={null}
      onUseItem={jest.fn()} onLearnScroll={jest.fn()} usedItemIds={[]} onHired={jest.fn()} /></StrictMode>);
    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
    expect(screen.queryByText('NPC stats')).not.toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('tab', { name: 'Inventory' })); });
    expect(screen.getByRole('tabpanel', { name: 'Inventory' })).toContainElement(screen.getByRole('status'));
    expect(screen.queryByRole('button', { name: 'Rusty Sword' })).not.toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('tab', { name: 'Stats' })); });
    await act(async () => { fireEvent.click(screen.getByRole('tab', { name: 'Inventory' })); });
    expect(getPlayerInventory).toHaveBeenCalledTimes(1);

    await act(async () => pending.resolve({ success: true, data: {
      equipment: [{ id: 'steel', type: 'swordSteel' }], equipped: {},
    } }));
    expect(await screen.findByRole('button', { name: 'Steel Sword' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(getPlayerInventory).toHaveBeenCalledTimes(1);
  });

  it.each(['response', 'network', 'missing data'])('allows retry after an inventory load failure (%s)', async failure => {
    const retry = pendingInventory();
    if (failure === 'network') jest.mocked(getPlayerInventory).mockRejectedValueOnce(new Error('Network failed'));
    else if (failure === 'response') jest.mocked(getPlayerInventory).mockResolvedValueOnce({ success: false, error: 'Read failed' });
    else jest.mocked(getPlayerInventory).mockResolvedValueOnce({ success: true });
    jest.mocked(getPlayerInventory).mockReturnValue(retry.promise);
    await renderCard(<CharacterCard boardId="board" mapId="map" player={makeNpc()} viewer={makePlayer()}
      isSelf={false} actionPointsLeft={20} playerStats={null} onUseItem={jest.fn()}
      onLearnScroll={jest.fn()} usedItemIds={[]} onHired={jest.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Inventory' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(failure === 'response' ? 'Read failed' : 'Unable to load inventory.');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry' })); });
    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
    await act(async () => retry.resolve({ success: true, data: {
      equipment: [{ id: 'steel', type: 'swordSteel' }], equipped: {},
    } }));
    expect(await screen.findByRole('button', { name: 'Steel Sword' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(getPlayerInventory).toHaveBeenCalledTimes(2);
  });

  it.each(['character', 'turn'])('ignores a pending inventory load after a %s change', async change => {
    const pending = pendingInventory();
    jest.mocked(getPlayerInventory).mockReturnValueOnce(pending.promise).mockResolvedValue({ success: true, data: {
      equipment: [{ id: 'steel', type: 'swordSteel' }], equipped: {},
    } });
    const props = { boardId: 'board', mapId: 'map', player: makeNpc(), viewer: makePlayer(),
      isSelf: false, actionPointsLeft: 20, playerStats: null, onUseItem: jest.fn(), onLearnScroll: jest.fn(),
      usedItemIds: [], onHired: jest.fn(), gameState: makeGameState() };
    const { rerender } = await renderCard(<CharacterCard {...props} />);
    await act(async () => { fireEvent.click(screen.getByRole('tab', { name: 'Inventory' })); });
    await act(async () => {
      rerender(<CharacterCard {...props}
        player={change === 'character' ? makeNpc({ id: 'npc-2' }) : props.player}
        gameState={change === 'turn' ? { ...props.gameState, turn: props.gameState.turn + 1 } : props.gameState} />);
    });
    expect(await screen.findByRole('button', { name: 'Steel Sword' })).toBeInTheDocument();

    await act(async () => pending.resolve({ success: true, data: {
      equipment: [{ id: 'old', type: 'swordRusty' }], equipped: {},
    } }));
    expect(screen.getByRole('button', { name: 'Steel Sword' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rusty Sword' })).not.toBeInTheDocument();
    expect(getPlayerInventory).toHaveBeenCalledTimes(2);
  });

  it('starts a fresh load when the displayed character snapshot changes in a transition', async () => {
    const pending = pendingInventory();
    jest.mocked(getPlayerInventory).mockResolvedValueOnce({ success: true, data: {
      equipment: [{ id: 'old', type: 'swordRusty' }], equipped: {},
    } }).mockReturnValueOnce(pending.promise);
    const props = { boardId: 'board', mapId: 'map', player: makeNpc(), viewer: makePlayer(),
      isSelf: false, actionPointsLeft: 20, playerStats: null, onUseItem: jest.fn(), onLearnScroll: jest.fn(),
      usedItemIds: [], onHired: jest.fn() };
    const { rerender } = await renderCard(<CharacterCard {...props} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Inventory' }));
    expect(await screen.findByRole('button', { name: 'Rusty Sword' })).toBeInTheDocument();

    await act(async () => { startTransition(() => rerender(<CharacterCard {...props} player={{ ...props.player }} />)); });
    expect(getPlayerInventory).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
    await act(async () => pending.resolve({ success: true, data: {
      equipment: [{ id: 'steel', type: 'swordSteel' }], equipped: {},
    } }));
    expect(await screen.findByRole('button', { name: 'Steel Sword' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rusty Sword' })).not.toBeInTheDocument();
  });

  it('shows pending inventory for another player, including an empty replacement list', async () => {
    jest.mocked(getPlayerInventory).mockResolvedValue({ success: true, data: { equipment: [], equipped: {} } });
    await renderCard(<CharacterCard boardId="board" mapId="map"
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
    await renderCard(<CharacterCard boardId="board" mapId="map" player={makeNpc({ masterId: 'warrior' })}
      viewer={makePlayer()} isSelf={false} actionPointsLeft={20} playerStats={null}
      onUseItem={jest.fn()} onLearnScroll={jest.fn()} usedItemIds={[]} onHired={jest.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Inventory' }));
    const button = await screen.findByRole('button', { name: 'Steel Sword' });
    fireEvent.click(button);
    fireEvent.click(screen.getByRole('button', { name: 'Take' }));
    await waitFor(() => expect(sync.updateInventory).toHaveBeenCalledWith(playerInventory));
    expect(takeItemFromNpc).toHaveBeenCalledWith('board', 'map', 'warrior', 'npc-1', 'steel');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Steel Sword' })).not.toBeInTheDocument());
    expect(getPlayerInventory).toHaveBeenCalledTimes(1);
  });

  it('blocks duplicate transfers, keeps failures in the picker, and clears the error when reopening it', async () => {
    const item = { id: 'sword', type: 'swordRusty' };
    const player = makePlayer({ equipment: [item] });
    const pending = pendingTransfer();
    const playerInventory = { equipment: [], equipped: {} };
    jest.mocked(giveItemToNpc).mockReturnValueOnce(pending.promise).mockResolvedValue({ success: true, data: {
      playerInventory, npcInventory: { equipment: [item], equipped: {} },
    } });
    await renderCard(<CharacterCard boardId="board" mapId="map" player={player} viewer={player} isSelf
      followerNPCs={[makeNpc({ masterId: player.id })]} actionPointsLeft={20} playerStats={makeStats()}
      onUseItem={jest.fn()} onLearnScroll={jest.fn()} usedItemIds={[]} onHired={jest.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Inventory' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rusty Sword' }));
    fireEvent.click(screen.getByRole('button', { name: 'Give' }));
    const picker = within(await screen.findByRole('dialog', { name: 'Give Rusty Sword' }));
    const follower = picker.getByRole('listitem', { name: 'Mercenary' });
    fireEvent.click(follower);
    fireEvent.keyDown(follower, { key: 'Enter' });
    expect(giveItemToNpc).toHaveBeenCalledTimes(1);
    expect(picker.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await act(async () => pending.resolve({ success: false, error: 'Unable to give item' }));
    expect(await picker.findByRole('alert')).toHaveTextContent('Unable to give item');
    expect(sync.updateInventory).not.toHaveBeenCalled();

    fireEvent.click(picker.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rusty Sword' }));
    fireEvent.click(screen.getByRole('button', { name: 'Give' }));
    const reopened = within(await screen.findByRole('dialog', { name: 'Give Rusty Sword' }));
    expect(reopened.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(reopened.getByRole('listitem', { name: 'Mercenary' }));
    await waitFor(() => expect(sync.updateInventory).toHaveBeenCalledWith(playerInventory));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it.each(['response', 'network'])('keeps an NPC item after a failed transfer and allows retry (%s)', async failure => {
    const item = { id: 'steel', type: 'swordSteel' };
    jest.mocked(getPlayerInventory).mockResolvedValue({ success: true, data: { equipment: [item], equipped: {} } });
    if (failure === 'network') jest.mocked(takeItemFromNpc).mockRejectedValueOnce(new Error('Transfer failed'));
    else jest.mocked(takeItemFromNpc).mockResolvedValueOnce({ success: false, error: 'Transfer failed' });
    jest.mocked(takeItemFromNpc).mockResolvedValue({ success: true, data: {
      playerInventory: { equipment: [item], equipped: {} }, npcInventory: { equipment: [], equipped: {} },
    } });
    await renderCard(<CharacterCard boardId="board" mapId="map" player={makeNpc({ masterId: 'warrior' })}
      viewer={makePlayer()} isSelf={false} actionPointsLeft={20} playerStats={null}
      onUseItem={jest.fn()} onLearnScroll={jest.fn()} usedItemIds={[]} onHired={jest.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Inventory' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Steel Sword' }));
    fireEvent.click(screen.getByRole('button', { name: 'Take' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Transfer failed');
    expect(sync.updateInventory).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Steel Sword' }));
    fireEvent.click(screen.getByRole('button', { name: 'Take' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Steel Sword' })).not.toBeInTheDocument());
    expect(takeItemFromNpc).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('ignores a transfer response from a previous turn', async () => {
    const item = { id: 'steel', type: 'swordSteel' };
    const pending = pendingTransfer();
    jest.mocked(getPlayerInventory).mockResolvedValue({ success: true, data: { equipment: [item], equipped: {} } });
    jest.mocked(takeItemFromNpc).mockReturnValueOnce(pending.promise);
    const viewer = makePlayer();
    const props = { boardId: 'board', mapId: 'map', player: makeNpc({ masterId: viewer.id }), viewer,
      isSelf: false, actionPointsLeft: 20, playerStats: null, onUseItem: jest.fn(), onLearnScroll: jest.fn(),
      usedItemIds: [], onHired: jest.fn(), gameState: makeGameState({ players: [viewer] }) };
    const { rerender } = await renderCard(<CharacterCard {...props} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Inventory' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Steel Sword' }));
    fireEvent.click(screen.getByRole('button', { name: 'Take' }));
    await act(async () => {
      rerender(<CharacterCard {...props} gameState={{ ...props.gameState, turn: props.gameState.turn + 1 }} />);
    });
    await act(async () => pending.resolve({ success: true, data: {
      playerInventory: { equipment: [item], equipped: {} }, npcInventory: { equipment: [], equipped: {} },
    } }));
    expect(sync.updateInventory).not.toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'Steel Sword' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
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
    await renderCard(<CharacterCard boardId="board" mapId="map" player={player} viewer={player} isSelf
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
