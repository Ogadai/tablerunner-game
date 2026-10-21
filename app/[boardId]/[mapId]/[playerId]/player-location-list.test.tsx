import { useState, type ComponentProps } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Swal from 'sweetalert2';
import { takeItemAtLocation } from '@/lib/store/playerInventory';
import { PlayerActionType } from '@/lib/store/types';
import PlayerLocationList from './player-location-list';
import CharacterCard from './character-card';
import sync from './player-stats-sync.service';
import { EntityItemClass } from './entity-list';
import { makeEntity, makeGameState, makePlayer, makeStats } from './test-fixtures';
import { createNpc } from '@/lib/runner/test-support/fixtures';

jest.mock('sweetalert2', () => ({ __esModule: true, default: { fire: jest.fn() } }));
jest.mock('@/lib/store/playerInventory', () => ({ takeItemAtLocation: jest.fn() }));
jest.mock('./player-stats-sync.service', () => ({ __esModule: true, default: { updateInventory: jest.fn() } }));
jest.mock('./character-card', () => ({ __esModule: true, default: jest.fn() }));

const sword = { id: 'sword-1', type: 'swordRusty' };
const monster = { id: 'enemy-1', type: 'goblin', health: 10, location: 1, team: 'monster' };

function PickupLocationList(props: ComponentProps<typeof PlayerLocationList>) {
  const [items, setItems] = useState(props.items);
  return <PlayerLocationList {...props} items={items} onItemTaken={itemId => {
    props.onItemTaken(itemId);
    setItems(current => current.filter(item => item.id !== itemId));
  }} />;
}

function pendingPickup() {
  let resolve!: (result: Awaited<ReturnType<typeof takeItemAtLocation>>) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<Awaited<ReturnType<typeof takeItemAtLocation>>>((resolvePickup, rejectPickup) => {
    resolve = resolvePickup;
    reject = rejectPickup;
  });
  return { promise, resolve, reject };
}

function setup(overrides: Partial<ComponentProps<typeof PlayerLocationList>> = {}, manageItems = false) {
  const props = {
    boardId: 'board', mapId: 'map', player: makePlayer(), otherPlayers: [], monsters: [], npcs: [],
    entities: [makeEntity({ id: 'warrior', className: EntityItemClass.self })], items: [sword],
    playerStats: makeStats(), actionsState: { actions: [] }, addNewAction: jest.fn().mockResolvedValue(undefined),
    onItemTaken: jest.fn(),
    ...overrides,
  };
  const view = render(manageItems ? <PickupLocationList {...props} /> : <PlayerLocationList {...props} />);
  return { ...view, props };
}

describe('PlayerLocationList', () => {
  beforeEach(() => {
    jest.mocked(CharacterCard).mockImplementation(props => <>
      <span>{props.player.name}</span>
      <button onClick={() => props.onUseItem(sword)}>Use item</button>
      <button onClick={() => props.onLearnScroll({ id: 'scroll-1', type: 'spiritArrowScroll' })}>Learn scroll</button>
    </>);
    jest.mocked(takeItemAtLocation).mockReset().mockResolvedValue({ success: true, data: { equipment: [sword], equipped: {} } });
  });

  it('takes an item and synchronizes the returned inventory', async () => {
    const { props } = setup({}, true);
    fireEvent.click(screen.getByRole('button', { name: 'Rusty Sword' }));
    await waitFor(() => expect(sync.updateInventory).toHaveBeenCalledWith({ equipment: [sword], equipped: {} }));
    expect(takeItemAtLocation).toHaveBeenCalledWith('board', 'map', 'warrior', sword.id);
    expect(props.onItemTaken).toHaveBeenCalledWith(sword.id);
    expect(screen.queryByRole('button', { name: 'Rusty Sword' })).not.toBeInTheDocument();
  });

  it('removes each clicked item immediately and saves rapid pickups in order without duplicates', async () => {
    const secondSword = { ...sword, id: 'sword-2' };
    const potion = { id: 'potion', type: 'healingPotion' };
    const first = pendingPickup();
    const second = pendingPickup();
    const inventory = { equipment: [sword, secondSword, potion], equipped: {} };
    jest.mocked(takeItemAtLocation).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
      .mockResolvedValue({ success: true, data: inventory });
    setup({ items: [sword, secondSword, potion] }, true);
    const firstButton = screen.getAllByRole('button', { name: 'Rusty Sword' })[0];
    fireEvent.click(firstButton);
    expect(screen.getAllByRole('button', { name: 'Rusty Sword' })).toHaveLength(1);
    fireEvent.click(firstButton);
    fireEvent.click(screen.getByRole('button', { name: 'Rusty Sword' }));
    fireEvent.click(screen.getByRole('button', { name: 'Minor Healing Potion' }));
    expect(screen.queryByRole('button', { name: 'Rusty Sword' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Minor Healing Potion' })).not.toBeInTheDocument();
    expect(takeItemAtLocation).toHaveBeenCalledTimes(1);
    expect(sync.updateInventory).not.toHaveBeenCalled();

    await act(async () => first.resolve({ success: true, data: { equipment: [sword], equipped: {} } }));
    expect(takeItemAtLocation).toHaveBeenNthCalledWith(2, 'board', 'map', 'warrior', secondSword.id);
    expect(screen.queryByRole('button', { name: 'Rusty Sword' })).not.toBeInTheDocument();
    await act(async () => second.resolve({ success: true, data: { equipment: [sword, secondSword], equipped: {} } }));
    await waitFor(() => expect(sync.updateInventory).toHaveBeenLastCalledWith(inventory));
    expect(takeItemAtLocation).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole('button', { name: 'Rusty Sword' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Minor Healing Potion' })).not.toBeInTheDocument();
  });

  it.each(['response', 'network'])('quietly restores a failed pickup and continues with other items (%s)', async failure => {
    const first = pendingPickup();
    const potion = { id: 'potion', type: 'healingPotion' };
    jest.mocked(takeItemAtLocation).mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce({ success: true, data: { equipment: [potion], equipped: {} } });
    const { props } = setup({ items: [sword, potion] }, true);
    fireEvent.click(screen.getByRole('button', { name: 'Rusty Sword' }));
    fireEvent.click(screen.getByRole('button', { name: 'Minor Healing Potion' }));
    await act(async () => {
      if (failure === 'network') first.reject(new Error('Offline'));
      else first.resolve({ success: false, error: 'Unable to pick up item' });
    });
    expect(await screen.findByRole('button', { name: 'Rusty Sword' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Minor Healing Potion' })).not.toBeInTheDocument();
    expect(sync.updateInventory).toHaveBeenCalledTimes(1);
    expect(props.onItemTaken).toHaveBeenCalledWith(potion.id);
    expect(Swal.fire).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Rusty Sword' }));
    await waitFor(() => expect(props.onItemTaken).toHaveBeenCalledWith(sword.id));
    expect(screen.queryByRole('button', { name: 'Rusty Sword' })).not.toBeInTheDocument();
  });

  it('removes an already claimed item without adding it to inventory or displaying an error', async () => {
    const inventory = { equipment: [], equipped: {} };
    jest.mocked(takeItemAtLocation).mockResolvedValueOnce({ success: true, data: inventory });
    setup({}, true);
    fireEvent.click(screen.getByRole('button', { name: 'Rusty Sword' }));
    await waitFor(() => expect(sync.updateInventory).toHaveBeenCalledWith(inventory));
    expect(screen.queryByRole('button', { name: 'Rusty Sword' })).not.toBeInTheDocument();
    expect(Swal.fire).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each(['location', 'player', 'turn', 'unmount'])('ignores old pickup responses and queued requests after a change of %s', async change => {
    const first = pendingPickup();
    const potion = { id: 'potion', type: 'healingPotion' };
    jest.mocked(takeItemAtLocation).mockReturnValueOnce(first.promise);
    const { props, rerender, unmount } = setup({ items: [sword, potion], gameState: makeGameState() });
    fireEvent.click(screen.getByRole('button', { name: 'Rusty Sword' }));
    fireEvent.click(screen.getByRole('button', { name: 'Minor Healing Potion' }));
    if (change === 'unmount') unmount();
    else {
      rerender(<PlayerLocationList {...props}
        player={change === 'player' ? makePlayer({ id: 'other' }) : change === 'location'
          ? makePlayer({ location: { id: 2, description: '', move: [] } }) : props.player}
        gameState={change === 'turn' ? { ...props.gameState!, turn: props.gameState!.turn + 1 } : props.gameState} />);
      expect(screen.getByRole('button', { name: 'Rusty Sword' })).toBeInTheDocument();
    }
    await act(async () => first.resolve({ success: true, data: { equipment: [sword], equipped: {} } }));
    expect(takeItemAtLocation).toHaveBeenCalledTimes(1);
    expect(sync.updateInventory).not.toHaveBeenCalled();
    expect(props.onItemTaken).not.toHaveBeenCalled();
  });

  it('keeps incoming location items visible while a pickup is pending', async () => {
    const first = pendingPickup();
    jest.mocked(takeItemAtLocation).mockReturnValueOnce(first.promise);
    const { props, rerender } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Rusty Sword' }));
    rerender(<PlayerLocationList {...props} items={[sword, { id: 'potion', type: 'healingPotion' }]} />);
    expect(screen.queryByRole('button', { name: 'Rusty Sword' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Minor Healing Potion' })).toBeInTheDocument();
    await act(async () => first.resolve({ success: false }));
    expect(await screen.findByRole('button', { name: 'Rusty Sword' })).toBeInTheDocument();
  });

  it.each(['player', 'npc'])('blocks pickup for an enemy %s', async kind => {
    setup(kind === 'player' ? { otherPlayers: [makePlayer({ id: 'enemy', team: 'red' })] }
      : { npcs: [createNpc({ team: 'red' })] });
    fireEvent.click(screen.getByRole('button', { name: 'Rusty Sword' }));
    await waitFor(() => expect(Swal.fire).toHaveBeenCalled());
    expect(takeItemAtLocation).not.toHaveBeenCalled();
  });

  it('allows pickup and viewing an allied monster without offering an attack', async () => {
    setup({ monsters: [{ ...monster, team: 'good' }], entities: [makeEntity({ className: EntityItemClass.npc })] });
    fireEvent.click(screen.getByRole('button', { name: 'Rusty Sword' }));
    await waitFor(() => expect(takeItemAtLocation).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('listitem'));
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Goblin');
    expect(screen.queryByRole('button', { name: 'Attack' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('opens an enemy player character card', () => {
    const enemy = makePlayer({ id: 'enemy-1', name: 'Rival', team: 'red' });
    setup({ otherPlayers: [enemy], entities: [makeEntity()] });
    fireEvent.click(screen.getByRole('listitem'));
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Rival Level 1');
  });

  it.each(['dead', 'enemies'])('blocks item pickup when %s', async reason => {
    setup(reason === 'dead' ? { player: makePlayer({ health: 0 }) } : { monsters: [monster] });
    fireEvent.click(screen.getByRole('button', { name: 'Rusty Sword' }));
    await waitFor(() => expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Item blocked!', text: reason === 'dead' ? 'You cannot pick up items while you are dead.'
        : 'You cannot pick up items while there are enemies.',
    })));
    expect(takeItemAtLocation).not.toHaveBeenCalled();
  });

  it('opens a monster and queues an attack on that instance', async () => {
    const { props } = setup({ entities: [makeEntity()], monsters: [monster] });
    fireEvent.click(screen.getByRole('listitem'));
    fireEvent.click(screen.getByRole('button', { name: 'Attack' }));
    expect(props.addNewAction).toHaveBeenCalledWith({ type: PlayerActionType.Attack, description: 'Attack Goblin', target: 'enemy-1' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it.each(['Use item', 'Learn scroll'])('queues %s from the character card and closes it', async action => {
    const { props } = setup();
    fireEvent.click(screen.getByRole('listitem'));
    fireEvent.click(screen.getByRole('button', { name: action }));
    expect(props.addNewAction).toHaveBeenCalledWith(expect.objectContaining(action === 'Use item'
      ? { type: PlayerActionType.UseItem, itemId: sword.id }
      : { type: PlayerActionType.ReadScroll, itemId: 'scroll-1' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('refreshes an open character card when player props change', () => {
    const { props, rerender } = setup();
    fireEvent.click(screen.getByRole('listitem'));
    rerender(<PlayerLocationList {...props} player={makePlayer({ name: 'Updated hero', health: 7 })} />);
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Updated hero Level 1');
    expect(jest.mocked(CharacterCard).mock.calls.at(-1)?.[0]).toMatchObject({
      isSelf: true, player: { name: 'Updated hero', health: 7 }, playerStats: props.playerStats,
    });
  });
});
