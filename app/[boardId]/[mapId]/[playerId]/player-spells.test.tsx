import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SpellIds, spells } from '@/lib/games/spells';
import { PlayerActionCast, PlayerActionType } from '@/lib/store/types';
import PlayerSpells from './player-spells';
import { EntityItemClass } from './entity-list';
import { makeEntity, makePlayer, makeStats } from './test-fixtures';

jest.mock('sweetalert2', () => ({ __esModule: true, default: { fire: jest.fn() } }));

function setup(spellId = SpellIds.spiritArrow, entities = [makeEntity()]) {
  const addNewAction = jest.fn().mockResolvedValue(undefined);
  render(<PlayerSpells playerSpells={[spellId]} player={makePlayer({ id: spells[spellId].characterType ?? 'mage', recentSpells: [spellId] })}
    entities={entities} playerStats={makeStats({ actionPointsTotal: 30, magicLeft: 30 })}
    actionsState={{ actions: [] }} addNewAction={addNewAction} />);
  return addNewAction;
}

describe('PlayerSpells', () => {
  it('makes a newly queued spell available before the turn runs and updates when it is removed', async () => {
    const addNewAction = jest.fn().mockResolvedValue(undefined);
    const player = makePlayer({ id: 'mage', recentSpells: [SpellIds.heal] });
    const props = { playerSpells: [SpellIds.spiritArrow], player, entities: [makeEntity()],
      playerStats: makeStats({ actionPointsTotal: 30, magicLeft: 30 }), addNewAction };
    const { rerender } = render(<PlayerSpells {...props} actionsState={{ actions: [] }} />);

    fireEvent.click(screen.getByRole('button', { name: /Spells/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Spirit Arrow' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cast' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(addNewAction).toHaveBeenCalledWith(expect.objectContaining({ spellId: SpellIds.spiritArrow }));
    expect(screen.queryByRole('button', { name: 'Spirit Arrow' })).not.toBeInTheDocument();

    const action: PlayerActionCast = { id: 0, type: PlayerActionType.Cast, description: 'Cast Spirit Arrow',
      spellId: SpellIds.spiritArrow, targetId: 'enemy-1' };
    rerender(<PlayerSpells {...props} actionsState={{ actions: [action] }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Spirit Arrow' }));
    expect(addNewAction).toHaveBeenCalledTimes(2);
    expect(addNewAction).toHaveBeenLastCalledWith({ type: PlayerActionType.Cast,
      description: 'Cast Spirit Arrow', spellId: SpellIds.spiritArrow, targetId: 'enemy-1' });
    expect(screen.getByRole('button', { name: 'Heal' })).toBeInTheDocument();
    expect(player.recentSpells).toEqual([SpellIds.heal]);

    rerender(<PlayerSpells {...props} actionsState={{ actions: [] }} />);
    expect(screen.queryByRole('button', { name: 'Spirit Arrow' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Heal' })).toBeInTheDocument();
  });

  it('keeps the two most recent distinct spells, prioritising queued casts over past casts', () => {
    const casts: PlayerActionCast[] = [SpellIds.spiritArrow, SpellIds.fireWall, SpellIds.spiritArrow]
      .map((spellId, id) => ({ id, spellId, type: PlayerActionType.Cast, description: 'Cast' }));
    const actions = [...casts, { id: 3, type: PlayerActionType.Attack, description: 'Attack' }];
    render(<PlayerSpells playerSpells={[SpellIds.spiritArrow, SpellIds.fireWall]}
      player={makePlayer({ id: 'mage', recentSpells: [SpellIds.spiritArrow, SpellIds.heal] })}
      entities={[makeEntity()]} playerStats={makeStats()} actionsState={{ actions }} addNewAction={jest.fn()} />);

    expect(screen.getAllByRole('button', { name: /^(Spirit Arrow|Fire Wall|Heal)$/ })
      .map(button => button.getAttribute('aria-label'))).toEqual(['Spirit Arrow', 'Fire Wall']);
    expect(actions).toEqual([...casts, { id: 3, type: PlayerActionType.Attack, description: 'Attack' }]);
  });

  it.each([{ actionPointsTotal: 0 }, { magicLeft: 0 }])('disables unaffordable quick actions: %o', stats => {
    const addNewAction = jest.fn();
    render(<PlayerSpells playerSpells={[SpellIds.spiritArrow]}
      player={makePlayer({ id: 'mage', recentSpells: [SpellIds.spiritArrow] })} entities={[makeEntity()]}
      playerStats={makeStats(stats)} actionsState={{ actions: [] }} addNewAction={addNewAction} />);
    const spellButton = screen.getByRole('button', { name: 'Spirit Arrow' });
    expect(spellButton).toBeDisabled();
    fireEvent.click(spellButton);
    if ('actionPointsTotal' in stats) {
      const attackButton = screen.getByRole('button', { name: 'Attack' });
      expect(attackButton).toBeDisabled();
      fireEvent.click(attackButton);
    }
    expect(addNewAction).not.toHaveBeenCalled();
  });
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

  it('disables a targeted quick spell when there are no targets', () => {
    const add = setup(SpellIds.spiritArrow, [makeEntity({ health: 0 })]);
    const spellButton = screen.getByRole('button', { name: 'Spirit Arrow' });
    expect(spellButton).toBeDisabled();
    fireEvent.click(spellButton);
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
    render(<PlayerSpells playerSpells={[SpellIds.spiritArrow]} player={makePlayer({ id: 'mage' })} entities={[makeEntity()]}
      playerStats={makeStats(stats)} actionsState={{ actions: [] }} addNewAction={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Spells/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Spirit Arrow' }));
    expect(screen.queryByRole('button', { name: 'Cast' })).not.toBeInTheDocument();
  });

  it.each(['witch', 'barbarian', 'ranger'])('hides spells that do not belong to %s', id => {
    render(<PlayerSpells playerSpells={[SpellIds.spiritArrow]} player={makePlayer({ id, recentSpells: [SpellIds.spiritArrow] })}
      entities={[makeEntity()]} playerStats={makeStats()} actionsState={{ actions: [] }} addNewAction={jest.fn()} />);
    expect(screen.queryByRole('button', { name: /Spells/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Spirit Arrow' })).not.toBeInTheDocument();
  });
});
