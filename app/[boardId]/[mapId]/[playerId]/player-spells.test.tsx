import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Swal from 'sweetalert2';
import { SpellIds, spells } from '@/lib/games/spells';
import { PlayerActionType } from '@/lib/store/types';
import PlayerSpells from './player-spells';
import { EntityItemClass } from './entity-list';
import { makeEntity, makePlayer, makeStats } from './test-fixtures';

jest.mock('sweetalert2', () => ({ __esModule: true, default: { fire: jest.fn() } }));

function setup(spellId = SpellIds.spiritArrow, entities = [makeEntity()]) {
  const addNewAction = jest.fn().mockResolvedValue(undefined);
  render(<PlayerSpells playerSpells={[spellId]} player={makePlayer({ recentSpells: [spellId] })}
    entities={entities} playerStats={makeStats({ actionPointsTotal: 30, magicLeft: 30 })} addNewAction={addNewAction} />);
  return addNewAction;
}

describe('PlayerSpells', () => {
  it('attacks the single living enemy, ignoring dead enemies and friends', () => {
    const add = setup(SpellIds.spiritArrow, [makeEntity(), makeEntity({ id: 'dead', health: 0 }),
      makeEntity({ id: 'friend', className: EntityItemClass.friendly })]);
    fireEvent.click(screen.getByRole('button', { name: 'Attack' }));
    expect(add).toHaveBeenCalledWith({ type: PlayerActionType.Attack, description: 'Attack Enemy', target: 'enemy-1' });
  });

  it('casts directly when there is exactly one eligible target', () => {
    const add = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Spirit Arrow' }));
    expect(add).toHaveBeenCalledWith({ type: PlayerActionType.Cast, description: 'Cast Spirit Arrow',
      spellId: SpellIds.spiritArrow, targetId: 'enemy-1' });
  });

  it('opens an attack picker for multiple living enemies', async () => {
    const add = setup(SpellIds.spiritArrow, [makeEntity(), makeEntity({ id: 'enemy-2', name: 'Second enemy' })]);
    fireEvent.click(screen.getByRole('button', { name: 'Attack' }));
    expect(add).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('listitem')[1]);
    expect(add).toHaveBeenCalledWith({ type: PlayerActionType.Attack, description: 'Attack Second enemy', target: 'enemy-2' });
    await waitFor(() => expect(screen.queryByRole('list')).not.toBeInTheDocument());
  });

  it('warns without submitting when a targeted spell has no targets', () => {
    const add = setup(SpellIds.spiritArrow, [makeEntity({ health: 0 })]);
    fireEvent.click(screen.getByRole('button', { name: 'Spirit Arrow' }));
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: 'Cannot cast spell!' }));
    expect(add).not.toHaveBeenCalled();
  });

  it.each([SpellIds.heal, SpellIds.spiritArrow, SpellIds.animateCorpse])(
    'filters the target picker for %s and submits the chosen target', async spellId => {
      const friends = [makeEntity({ id: 'self', className: EntityItemClass.self }),
        makeEntity({ id: 'npc', className: EntityItemClass.npc })];
      const enemies = [makeEntity(), makeEntity({ id: 'enemy-2' })];
      const corpses = [makeEntity({ id: 'corpse-1', health: 0 }), makeEntity({ id: 'corpse-2', health: 0 })];
      const add = setup(spellId, [...friends, ...enemies, ...corpses]);
      fireEvent.click(screen.getByRole('button', { name: spells[spellId].name }));
      expect(screen.getByRole('dialog', { name: 'Choose a target' })).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
      fireEvent.click(screen.getAllByRole('listitem')[1]);
      const targetId = spellId === SpellIds.heal ? 'npc' : spellId === SpellIds.spiritArrow ? 'enemy-2' : 'corpse-2';
      expect(add).toHaveBeenCalledWith(expect.objectContaining({ spellId, targetId }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    },
  );

  it('submits an area spell without asking for a target', () => {
    const add = setup(SpellIds.fireWall);
    fireEvent.click(screen.getByRole('button', { name: 'Fire Wall' }));
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ spellId: SpellIds.fireWall, targetId: undefined }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each([{ magicLeft: 2 }, { actionPointsTotal: 0 }])('hides Cast when resources are insufficient: %o', stats => {
    render(<PlayerSpells playerSpells={[SpellIds.spiritArrow]} player={makePlayer()} entities={[makeEntity()]}
      playerStats={makeStats(stats)} addNewAction={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Spells/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Spirit Arrow' }));
    expect(screen.queryByRole('button', { name: 'Cast' })).not.toBeInTheDocument();
  });
});
