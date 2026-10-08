import type { ComponentProps } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Swal from 'sweetalert2';
import { takeItemAtLocation } from '@/lib/store/playerInventory';
import { warlordEditParty } from '@/lib/runner/warlords-of-fire/server-actions';
import { PlayerActionType } from '@/lib/store/types';
import PlayerLocationList from './player-location-list';
import CharacterCard from './character-card';
import sync from './player-stats-sync.service';
import { EntityItemClass } from './entity-list';
import { makeEntity, makePlayer, makeStats } from './test-fixtures';
import { createNpc } from '@/lib/runner/test-support/fixtures';

jest.mock('sweetalert2', () => ({ __esModule: true, default: { fire: jest.fn() } }));
jest.mock('@/lib/store/playerInventory', () => ({ takeItemAtLocation: jest.fn() }));
jest.mock('./player-stats-sync.service', () => ({ __esModule: true, default: { updateInventory: jest.fn() } }));
jest.mock('./character-card', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/lib/runner/warlords-of-fire/server-actions', () => ({ warlordEditParty: jest.fn() }));

const sword = { id: 'sword-1', type: 'swordRusty' };
const monster = { id: 'enemy-1', type: 'goblin', health: 10, location: 1, team: 'monster' };

function setup(overrides: Partial<ComponentProps<typeof PlayerLocationList>> = {}) {
  const props = {
    boardId: 'board', mapId: 'map', player: makePlayer(), otherPlayers: [], monsters: [], npcs: [],
    entities: [makeEntity({ id: 'warrior', className: EntityItemClass.self })], items: [sword],
    playerStats: makeStats(), actionsState: { actions: [] }, addNewAction: jest.fn().mockResolvedValue(undefined),
    onPartyChanged: jest.fn(),
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
  });

  it('opens an enemy player character card', () => {
    const enemy = makePlayer({ id: 'enemy-1', name: 'Rival', team: 'red' });
    setup({ otherPlayers: [enemy], entities: [makeEntity()] });
    fireEvent.click(screen.getByRole('listitem'));
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Rival Level 1');
  });

  it('reflects saved party membership in an open card and when reopening it', async () => {
    jest.mocked(warlordEditParty).mockResolvedValue({ success: true });
    const ally = { ...monster, team: 'good' };
    const { props, rerender } = setup({ monsters: [ally], entities: [makeEntity({ className: EntityItemClass.npc })] });
    fireEvent.click(screen.getByRole('listitem'));
    fireEvent.click(screen.getByRole('switch', { name: 'In party' }));
    await waitFor(() => expect(props.onPartyChanged).toHaveBeenCalledWith(ally.id, true));

    rerender(<PlayerLocationList {...props} monsters={[{ ...ally, masterId: props.player.id }]} />);
    expect(screen.getByRole('switch', { name: 'In party' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('listitem'));
    expect(screen.getByRole('switch', { name: 'In party' })).toBeChecked();
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
