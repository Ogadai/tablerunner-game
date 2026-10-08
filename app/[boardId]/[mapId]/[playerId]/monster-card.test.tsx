import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { warlordEditParty } from '@/lib/runner/warlords-of-fire/server-actions';
import type { MonsterState } from '@/lib/store/types';
import MonsterCard from './monster-card';
import { makePlayer } from './test-fixtures';

jest.mock('@/lib/runner/warlords-of-fire/server-actions', () => ({ warlordEditParty: jest.fn() }));

const player = makePlayer();
const monster: MonsterState = { id: 'goblin-1', type: 'goblin', location: player.location.id, health: 10, team: player.team };

function PartyCard({ initialMonster = monster }: { initialMonster?: MonsterState }) {
  const [partyMonster, setPartyMonster] = useState(initialMonster);
  return <MonsterCard boardId="board" mapId="map" player={player} monster={partyMonster}
    canAttack={false} onAttack={jest.fn()}
    onPartyChanged={inParty => setPartyMonster(current => ({ ...current, masterId: inParty ? player.id : undefined }))} />;
}

describe('MonsterCard', () => {
  it.each([[true, 10, true], [false, 10, false], [true, 0, false]])(
    'gates attacking by permission %s and health %s', (canAttack, health, visible) => {
      const onAttack = jest.fn();
      render(<MonsterCard boardId="board" mapId="map" player={player}
        monster={{ id: 'goblin-1', type: 'goblin', location: 1, health, team: 'monster' }}
        canAttack={canAttack} onAttack={onAttack} onPartyChanged={jest.fn()} />);
      if (visible) {
        fireEvent.click(screen.getByRole('button', { name: 'Attack' }));
        expect(onAttack).toHaveBeenCalledTimes(1);
      } else {
        expect(screen.queryByRole('button', { name: 'Attack' })).not.toBeInTheDocument();
      }
    },
  );

  it('adds and removes an allied monster from the party', async () => {
    jest.mocked(warlordEditParty).mockResolvedValue({ success: true });
    render(<PartyCard />);
    const toggle = screen.getByRole('switch', { name: 'In party' });
    expect(toggle).not.toBeChecked();

    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).toBeChecked());
    expect(warlordEditParty).toHaveBeenCalledWith('board', 'map', player.id, monster.id, true);
    await waitFor(() => expect(toggle).toBeEnabled());

    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).not.toBeChecked());
    expect(warlordEditParty).toHaveBeenLastCalledWith('board', 'map', player.id, monster.id, false);
  });

  it('keeps the saved party state and shows an error when the update fails', async () => {
    jest.mocked(warlordEditParty).mockResolvedValue({ success: false, error: 'Unable to save party' });
    render(<PartyCard initialMonster={{ ...monster, masterId: player.id }} />);
    const toggle = screen.getByRole('switch', { name: 'In party' });
    fireEvent.click(toggle);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save party');
    expect(toggle).toBeChecked();
    expect(toggle).toBeEnabled();
  });

  it('hides the party toggle for an enemy monster', () => {
    render(<PartyCard initialMonster={{ ...monster, team: 'monster' }} />);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it.each([
    { masterId: 'another-player' },
    { health: 0 },
    { location: player.location.id + 1 },
  ])('disables editing an unavailable monster (%o)', overrides => {
    render(<PartyCard initialMonster={{ ...monster, ...overrides }} />);
    expect(screen.getByRole('switch', { name: 'In party' })).toBeDisabled();
  });
});
