import type { ComponentProps } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Swal from 'sweetalert2';
import { takeItemAtLocation } from '@/lib/store/playerInventory';
import { PlayerActionType } from '@/lib/store/types';
import PlayerLocationList from './player-location-list';
import CharacterCard from './character-card';
import sync from './player-stats-sync.service';
import { EntityItemClass } from './entity-list';
import { makeEntity, makePlayer, makeStats } from './test-fixtures';

jest.mock('sweetalert2', () => ({ __esModule: true, default: { fire: jest.fn() } }));
jest.mock('@/lib/store/playerInventory', () => ({ takeItemAtLocation: jest.fn() }));
jest.mock('./player-stats-sync.service', () => ({ __esModule: true, default: { updateInventory: jest.fn() } }));
jest.mock('./character-card', () => ({ __esModule: true, default: jest.fn() }));

const sword = { id: 'sword-1', type: 'swordRusty' };
const monster = { id: 'enemy-1', type: 'goblin', health: 10, location: 1 };

function setup(overrides: Partial<ComponentProps<typeof PlayerLocationList>> = {}) {
  const props = {
    boardId: 'board', mapId: 'map', player: makePlayer(), otherPlayers: [], monsters: [], npcs: [],
    entities: [makeEntity({ id: 'warrior', className: EntityItemClass.self })], items: [sword],
    playerStats: makeStats(), actionsState: { actions: [] }, addNewAction: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  const view = render(<PlayerLocationList {...props} />);
  return { ...view, props };
}

describe('PlayerLocationList', () => {
  beforeEach(() => {
    jest.mocked(CharacterCard).mockImplementation(props => <>
      <span>{props.player.name}</span>
      <button onClick={() => props.onUseItem(sword)}>Use item</button>
      <button onClick={() => props.onLearnScroll({ id: 'scroll-1', type: 'spiritArrowScroll' })}>Learn scroll</button>
    </>);
    jest.mocked(takeItemAtLocation).mockResolvedValue({ success: true, data: { equipment: [sword], equipped: {} } });
  });

  it('takes an item and synchronizes the returned inventory', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Rusty Sword' }));
    await waitFor(() => expect(sync.updateInventory).toHaveBeenCalledWith({ equipment: [sword], equipped: {} }));
    expect(takeItemAtLocation).toHaveBeenCalledWith('board', 'map', 'warrior', sword.id);
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
