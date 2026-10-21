import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { warlordEditParty } from '@/lib/runner/warlords-of-fire/server-actions';
import type { MonsterState } from '@/lib/store/types';
import { makePlayer } from '../test-fixtures';
import WarlordParty from './warlord-party';

jest.mock('@/lib/runner/warlords-of-fire/server-actions', () => ({ warlordEditParty: jest.fn() }));

const player = makePlayer();
const monster: MonsterState = { id: 'goblin-1', type: 'goblin', location: player.location.id, health: 10, team: player.team };

function Party({ initialMonsters = [monster], turn = 1 }: { initialMonsters?: MonsterState[]; turn?: number }) {
  const [locationMonsters, setMonsters] = useState(initialMonsters);
  return <WarlordParty boardId="board" mapId="map" turn={turn} player={player} locationMonsters={locationMonsters}
    processing={false} onPartyChanged={(id, inParty) => setMonsters(current => current.map(entry => entry.id === id
      ? { ...entry, masterId: inParty ? player.id : undefined } : entry))} />;
}

function openParty() {
  fireEvent.click(screen.getByRole('button', { name: 'Party' }));
}

function pendingSave() {
  let resolve!: (result: Awaited<ReturnType<typeof warlordEditParty>>) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<Awaited<ReturnType<typeof warlordEditParty>>>((resolveSave, rejectSave) => {
    resolve = resolveSave;
    reject = rejectSave;
  });
  return { promise, resolve, reject };
}

describe('WarlordParty', () => {
  beforeEach(() => {
    jest.mocked(warlordEditParty).mockReset().mockResolvedValue({ success: true });
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
    expect(screen.queryByRole('button', { name: 'Party' })).not.toBeInTheDocument();
  });

  it.each([
    { team: 'enemy' }, { team: null }, { masterId: 'another-player' }, { health: 0 }, { location: player.location.id + 1 },
  ])('shows only available monsters when opening the party (%o)', overrides => {
    render(<Party initialMonsters={[monster, { ...monster, id: 'unavailable', type: 'orc', ...overrides }]} />);
    openParty();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('listitem', { name: 'Goblin' })).toBeInTheDocument();
    expect(screen.queryByRole('listitem', { name: 'Orc' })).not.toBeInTheDocument();
  });

  it.each([{ processing: true }, { player: { ...player, health: 0 } }])('disables party editing (%o)', overrides => {
    render(<WarlordParty boardId="board" mapId="map" turn={1} player={player} locationMonsters={[monster]}
      processing={false} onPartyChanged={jest.fn()} {...overrides} />);
    expect(screen.getByRole('button', { name: 'Party' })).toBeDisabled();
  });

  it('moves immediately and queues a reversal while the first save is pending', async () => {
    const first = pendingSave();
    const second = pendingSave();
    jest.mocked(warlordEditParty).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    render(<Party />);
    openParty();
    const party = screen.getByRole('region', { name: 'Party' });
    const garrison = screen.getByRole('region', { name: 'Garrison' });

    fireEvent.click(within(garrison).getByRole('listitem', { name: 'Goblin' }));
    expect(within(party).getByRole('listitem', { name: 'Goblin' })).toBeInTheDocument();
    fireEvent.keyDown(within(party).getByRole('listitem', { name: 'Goblin' }), { key: 'Enter' });
    expect(within(garrison).getByRole('listitem', { name: 'Goblin' })).toBeInTheDocument();
    expect(warlordEditParty).toHaveBeenCalledTimes(1);

    await act(async () => first.resolve({ success: true }));
    expect(warlordEditParty).toHaveBeenNthCalledWith(2, 'board', 'map', player.id, monster.id, false);
    expect(within(garrison).getByRole('listitem', { name: 'Goblin' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Saving...');

    await act(async () => second.resolve({ success: true }));
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    openParty();
    expect(screen.getByRole('region', { name: 'Garrison' })).toContainElement(screen.getByRole('listitem', { name: 'Goblin' }));
  });

  it.each(['response', 'network'])('keeps an earlier %s failure when a later monster saves successfully', async failure => {
    const first = pendingSave();
    const orc = { ...monster, id: 'orc-1', type: 'orc' };
    jest.mocked(warlordEditParty).mockReturnValueOnce(first.promise);
    render(<Party initialMonsters={[monster, orc]} />);
    openParty();
    const party = screen.getByRole('region', { name: 'Party' });
    const garrison = screen.getByRole('region', { name: 'Garrison' });

    fireEvent.click(within(garrison).getByRole('listitem', { name: 'Goblin' }));
    fireEvent.click(within(garrison).getByRole('listitem', { name: 'Orc' }));
    expect(within(party).getAllByRole('listitem')).toHaveLength(2);
    expect(warlordEditParty).toHaveBeenCalledTimes(1);

    await act(async () => {
      if (failure === 'network') first.reject(new Error('Save failed'));
      else first.resolve({ success: false, error: 'Save failed' });
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Goblin: Save failed');
    expect(within(garrison).getByRole('listitem', { name: 'Goblin' })).toBeInTheDocument();
    expect(within(party).getByRole('listitem', { name: 'Orc' })).toBeInTheDocument();
    expect(warlordEditParty).toHaveBeenNthCalledWith(2, 'board', 'map', player.id, orc.id, true);

    fireEvent.click(within(garrison).getByRole('listitem', { name: 'Goblin' }));
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(within(party).getAllByRole('listitem')).toHaveLength(2);
  });

  it('restores the last confirmed membership when a queued reversal fails', async () => {
    const first = pendingSave();
    jest.mocked(warlordEditParty).mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce({ success: false, error: 'Cannot leave party' });
    render(<Party />);
    openParty();
    const party = screen.getByRole('region', { name: 'Party' });
    const garrison = screen.getByRole('region', { name: 'Garrison' });

    fireEvent.click(within(garrison).getByRole('listitem', { name: 'Goblin' }));
    fireEvent.click(within(party).getByRole('listitem', { name: 'Goblin' }));
    expect(within(garrison).getByRole('listitem', { name: 'Goblin' })).toBeInTheDocument();

    await act(async () => first.resolve({ success: true }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Goblin: Cannot leave party');
    expect(within(party).getByRole('listitem', { name: 'Goblin' })).toBeInTheDocument();
  });

  it('discards old queued changes when the turn changes and accepts new clicks', async () => {
    const first = pendingSave();
    const orc = { ...monster, id: 'orc-1', type: 'orc' };
    jest.mocked(warlordEditParty).mockReturnValueOnce(first.promise);
    const { rerender } = render(<Party initialMonsters={[monster, orc]} />);
    openParty();
    fireEvent.click(screen.getByRole('listitem', { name: 'Goblin' }));
    fireEvent.click(screen.getByRole('listitem', { name: 'Orc' }));

    rerender(<Party turn={2} />);
    const garrison = screen.getByRole('region', { name: 'Garrison' });
    expect(within(garrison).getAllByRole('listitem')).toHaveLength(2);
    fireEvent.click(within(garrison).getByRole('listitem', { name: 'Orc' }));

    await act(async () => first.resolve({ success: false, error: 'Old turn failed' }));
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    expect(warlordEditParty).toHaveBeenCalledTimes(2);
    expect(within(garrison).getByRole('listitem', { name: 'Goblin' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Party' })).toContainElement(screen.getByRole('listitem', { name: 'Orc' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('skips queued saves and parent updates after unmounting', async () => {
    const first = pendingSave();
    const onPartyChanged = jest.fn();
    jest.mocked(warlordEditParty).mockReturnValueOnce(first.promise);
    const { unmount } = render(<WarlordParty boardId="board" mapId="map" turn={1} player={player}
      locationMonsters={[monster]} processing={false} onPartyChanged={onPartyChanged} />);
    openParty();
    fireEvent.click(screen.getByRole('listitem', { name: 'Goblin' }));
    fireEvent.click(screen.getByRole('listitem', { name: 'Goblin' }));
    unmount();

    await act(async () => first.resolve({ success: true }));
    expect(warlordEditParty).toHaveBeenCalledTimes(1);
    expect(onPartyChanged).not.toHaveBeenCalled();
  });
});
