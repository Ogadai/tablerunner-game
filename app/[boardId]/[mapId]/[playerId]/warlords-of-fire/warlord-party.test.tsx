import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { warlordEditParty } from '@/lib/runner/warlords-of-fire/server-actions';
import type { MonsterState } from '@/lib/store/types';
import { makePlayer } from '../test-fixtures';
import WarlordParty from './warlord-party';

jest.mock('@/lib/runner/warlords-of-fire/server-actions', () => ({ warlordEditParty: jest.fn() }));

const player = makePlayer();
const monster: MonsterState = { id: 'goblin-1', type: 'goblin', location: player.location.id, health: 10, team: player.team };

function Party({ initialMonsters = [monster] }: { initialMonsters?: MonsterState[] }) {
  const [locationMonsters, setMonsters] = useState(initialMonsters);
  return <WarlordParty boardId="board" mapId="map" player={player} locationMonsters={locationMonsters}
    processing={false} onPartyChanged={(id, inParty) => setMonsters(current => current.map(entry => entry.id === id
      ? { ...entry, masterId: inParty ? player.id : undefined } : entry))} />;
}

function openParty() {
  fireEvent.click(screen.getByRole('button', { name: 'Party' }));
}

describe('WarlordParty', () => {
  beforeEach(() => {
    jest.mocked(warlordEditParty).mockResolvedValue({ success: true });
  });

  it('moves a monster between the garrison and party and preserves it when reopening', async () => {
    render(<Party />);
    openParty();
    const party = screen.getByRole('region', { name: 'Party' });
    const garrison = screen.getByRole('region', { name: 'Garrison' });
    fireEvent.click(within(garrison).getByRole('listitem', { name: 'Goblin' }));
    await waitFor(() => expect(within(party).getByRole('listitem', { name: 'Goblin' })).toBeInTheDocument());
    expect(warlordEditParty).toHaveBeenCalledWith('board', 'map', player.id, monster.id, true);
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    openParty();
    expect(screen.getByRole('region', { name: 'Party' })).toContainElement(screen.getByRole('listitem', { name: 'Goblin' }));
    fireEvent.keyDown(screen.getByRole('listitem', { name: 'Goblin' }), { key: 'Enter' });
    await waitFor(() => expect(screen.getByRole('region', { name: 'Garrison' })).toContainElement(
      screen.getByRole('listitem', { name: 'Goblin' }),
    ));
    expect(warlordEditParty).toHaveBeenLastCalledWith('board', 'map', player.id, monster.id, false);
  });

  it('keeps the saved membership and shows an error when an update fails', async () => {
    jest.mocked(warlordEditParty).mockResolvedValue({ success: false, error: 'Unable to save party' });
    render(<Party initialMonsters={[{ ...monster, masterId: player.id }]} />);
    openParty();
    fireEvent.click(screen.getByRole('listitem', { name: 'Goblin' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save party');
    expect(screen.getByRole('region', { name: 'Party' })).toContainElement(screen.getByRole('listitem', { name: 'Goblin' }));
  });

  it.each([
    { team: 'enemy' }, { team: null }, { masterId: 'another-player' }, { health: 0 }, { location: player.location.id + 1 },
  ])('excludes an unavailable monster (%o)', overrides => {
    render(<Party initialMonsters={[{ ...monster, ...overrides }]} />);
    openParty();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it.each([{ processing: true }, { player: { ...player, health: 0 } }])('disables party editing (%o)', overrides => {
    render(<WarlordParty boardId="board" mapId="map" player={player} locationMonsters={[monster]}
      processing={false} onPartyChanged={jest.fn()} {...overrides} />);
    expect(screen.getByRole('button', { name: 'Party' })).toBeDisabled();
  });

  it('blocks repeated clicks while saving', async () => {
    let finish!: (result: Awaited<ReturnType<typeof warlordEditParty>>) => void;
    jest.mocked(warlordEditParty).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    render(<Party />);
    openParty();
    const entity = screen.getByRole('listitem', { name: 'Goblin' });
    fireEvent.click(entity);
    fireEvent.click(entity);
    fireEvent.keyDown(entity, { key: 'Enter' });
    expect(warlordEditParty).toHaveBeenCalledTimes(1);
    await act(async () => finish({ success: true }));
  });
});
