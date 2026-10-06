import { act, fireEvent, render, screen } from '@testing-library/react';
import { setPlayerRaceTeam } from '@/lib/runner/race-of-fire/server-actions';
import type { PlayerSnapshot } from '@/lib/store/types';
import { makeGameState, makePlayerSnapshot } from '../test-fixtures';
import TeamSelectionContent from './team-selection-content';

jest.mock('@/lib/runner/race-of-fire/server-actions', () => ({ setPlayerRaceTeam: jest.fn() }));

const blueSnapshot = () => makePlayerSnapshot({ gameState: makeGameState({
  gameId: 'racefire', processState: { 'crystal-shard': { blueTeam: ['warrior'], redTeam: ['mage'] } },
}) });
const radio = (label: string) => screen.getByRole('radio', { name: label });

describe('TeamSelectionContent', () => {
  const onSnapshotChange = jest.fn();
  const mount = (snapshot = blueSnapshot(), disabled = false) => {
    const props = { boardId: 'board', mapId: 'map', snapshot, onSnapshotChange, disabled };
    return { ...render(<TeamSelectionContent {...props} />), props };
  };

  beforeEach(() => {
    jest.mocked(setPlayerRaceTeam).mockImplementation(async (_boardId, _mapId, _playerId, instructions) => ({
      success: true, data: instructions,
    }));
  });

  it.each([
    ['warrior', 'Blue team'], ['mage', 'Red team'], ['ranger', 'Independent (no team)'],
  ])('loads the persisted team for %s', (playerId, label) => {
    mount({ ...blueSnapshot(), playerId });
    expect(radio(label)).toBeChecked();
    expect(setPlayerRaceTeam).not.toHaveBeenCalled();
  });

  it('defaults to independent when the process state is missing', () => {
    mount(makePlayerSnapshot());
    expect(radio('Independent (no team)')).toBeChecked();
  });

  it.each([
    ['red', 'Red team'], [null, 'Independent (no team)'],
  ] as const)('prefers the pending instruction (%s) over the persisted blue team', (team, label) => {
    mount({ ...blueSnapshot(), instructions: { team } });
    expect(radio(label)).toBeChecked();
  });

  it.each([
    ['Red team', 'red'], ['Independent (no team)', null],
  ] as const)('saves %s, preserves other instructions and updates the snapshot without mutating it', async (label, team) => {
    const snapshot = { ...blueSnapshot(), instructions: { other: 'keep' } };
    const view = mount(snapshot);
    await act(async () => fireEvent.click(radio(label)));
    const instructions = { other: 'keep', team };
    expect(setPlayerRaceTeam).toHaveBeenCalledWith('board', 'map', 'warrior', instructions);
    expect(onSnapshotChange).toHaveBeenCalledWith({ ...snapshot, instructions });
    expect(snapshot.instructions).toEqual({ other: 'keep' });
    view.rerender(<TeamSelectionContent {...view.props} snapshot={{ ...snapshot, instructions }} />);
    expect(radio(label)).toBeChecked();
  });

  it('does not save when the selected team is clicked again', async () => {
    mount();
    await act(async () => fireEvent.click(radio('Blue team')));
    expect(setPlayerRaceTeam).not.toHaveBeenCalled();
  });

  it.each(['disabled', 'no game'])('disables choices when %s', reason => {
    mount(reason === 'no game' ? makePlayerSnapshot({ gameState: null }) : blueSnapshot(), reason === 'disabled');
    for (const input of screen.getAllByRole('radio')) expect(input).toBeDisabled();
    fireEvent.click(radio('Red team'));
    expect(setPlayerRaceTeam).not.toHaveBeenCalled();
  });

  it('disables further changes while saving and enables them after the response', async () => {
    let resolve!: (result: Awaited<ReturnType<typeof setPlayerRaceTeam>>) => void;
    jest.mocked(setPlayerRaceTeam).mockReturnValue(new Promise(done => { resolve = done; }));
    mount();
    await act(async () => fireEvent.click(radio('Red team')));
    expect(screen.getByRole('status')).toHaveTextContent('Saving team...');
    expect(radio('Red team')).toBeDisabled();
    fireEvent.click(radio('Independent (no team)'));
    expect(setPlayerRaceTeam).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ success: true, data: { team: 'red' } }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(radio('Red team')).toBeEnabled();
    expect(onSnapshotChange).toHaveBeenCalledTimes(1);
  });

  it.each(['server error', 'missing error', 'rejection'])('keeps the previous selection after %s and allows retry', async failure => {
    if (failure === 'rejection') jest.mocked(setPlayerRaceTeam).mockRejectedValueOnce(new Error('offline'));
    else jest.mocked(setPlayerRaceTeam).mockResolvedValueOnce({
      success: false, error: failure === 'server error' ? 'Team could not be saved' : undefined,
    });
    mount();
    await act(async () => fireEvent.click(radio('Red team')));
    expect(screen.getByRole('alert')).toHaveTextContent(failure === 'server error'
      ? 'Team could not be saved' : 'Unable to change team. Please try again.');
    expect(radio('Blue team')).toBeChecked();
    expect(onSnapshotChange).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(radio('Red team')));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onSnapshotChange).toHaveBeenCalledTimes(1);
  });

  it.each(['new turn', 'new player', 'unmount'])('ignores a save response after %s', async change => {
    let resolve!: (result: Awaited<ReturnType<typeof setPlayerRaceTeam>>) => void;
    jest.mocked(setPlayerRaceTeam).mockReturnValue(new Promise(done => { resolve = done; }));
    const view = mount();
    await act(async () => fireEvent.click(radio('Red team')));
    if (change === 'unmount') view.unmount();
    else {
      const snapshot: PlayerSnapshot = change === 'new player'
        ? { ...blueSnapshot(), playerId: 'mage' }
        : makePlayerSnapshot({ gameState: makeGameState({ gameId: 'racefire', turn: 2 }) });
      view.rerender(<TeamSelectionContent {...view.props} snapshot={snapshot} />);
    }
    await act(async () => resolve({ success: true, data: { team: 'red' } }));
    expect(onSnapshotChange).not.toHaveBeenCalled();
  });
});
