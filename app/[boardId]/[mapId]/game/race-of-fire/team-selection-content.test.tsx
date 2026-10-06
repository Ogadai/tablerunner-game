import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { getPlayerRaceTeams, setPlayerRaceTeam } from '@/lib/runner/race-of-fire/server-actions';
import RaceTeamTopicService from '@/app/message-bus/race-team-topic-service';
import { GameTopicMessageType, type RaceTeamUpdatedMessage } from '@/lib/message-types';
import type { PlayerSnapshot } from '@/lib/store/types';
import { makeGameState, makePlayer, makePlayerSnapshot } from '../test-fixtures';
import TeamSelectionContent from './team-selection-content';

jest.mock('@/lib/runner/race-of-fire/server-actions', () => ({
  getPlayerRaceTeams: jest.fn(), setPlayerRaceTeam: jest.fn(),
}));

const blueSnapshot = () => makePlayerSnapshot({ gameState: makeGameState({
  gameId: 'racefire', processState: { 'crystal-shard': { blueTeam: ['warrior'], redTeam: ['mage'] } },
}) });
const teamButton = (label: string) => screen.getByRole('button', { name: label });

describe('TeamSelectionContent', () => {
  const onSnapshotChange = jest.fn();
  const mount = (snapshot = blueSnapshot(), disabled = false) => {
    const props = { boardId: 'board', mapId: 'map', snapshot, onSnapshotChange, disabled };
    return { ...render(<TeamSelectionContent {...props} />), props };
  };

  beforeEach(() => {
    jest.mocked(getPlayerRaceTeams).mockReset().mockResolvedValue({ success: true, data: {} });
    jest.mocked(setPlayerRaceTeam).mockImplementation(async (_boardId, _mapId, _playerId, instructions) => ({
      success: true, data: instructions,
    }));
  });

  it('loads selections once and applies team messages without another request', async () => {
    const snapshot = makePlayerSnapshot({ gameState: makeGameState({
      gameId: 'racefire', players: [makePlayer(), makePlayer({ id: 'mage', name: 'Test Mage' })],
      processState: { 'crystal-shard': { blueTeam: ['warrior', 'mage'] } },
    }) });
    jest.mocked(getPlayerRaceTeams).mockResolvedValueOnce({
      success: true, data: { warrior: 'red', mage: null },
    });
    const view = mount(snapshot);
    await act(async () => {});
    const row = (label: string) => teamButton(label).parentElement!;
    expect(within(row('Red team')).getByRole('listitem', { name: 'Test Warrior' })).toBeInTheDocument();
    expect(within(row('No team')).getByRole('listitem', { name: 'Test Mage' })).toBeInTheDocument();
    expect(teamButton('Red team')).toHaveAttribute('aria-pressed', 'true');

    const message: RaceTeamUpdatedMessage = {
      type: GameTopicMessageType.RaceTeamUpdated, playerId: 'mage', team: 'blue',
    };
    await act(async () => RaceTeamTopicService.raiseRaceTeamUpdated('other-map', message));
    expect(getPlayerRaceTeams).toHaveBeenCalledTimes(1);
    await act(async () => RaceTeamTopicService.raiseRaceTeamUpdated('board-map', message));
    expect(within(row('Blue team')).getByRole('listitem', { name: 'Test Mage' })).toBeInTheDocument();
    expect(within(row('No team')).queryByRole('listitem')).not.toBeInTheDocument();
    await act(async () => RaceTeamTopicService.raiseRaceTeamUpdated('board-map', { ...message, team: null }));
    expect(within(row('No team')).getByRole('listitem', { name: 'Test Mage' })).toBeInTheDocument();

    view.unmount();
    RaceTeamTopicService.raiseRaceTeamUpdated('board-map', message);
    expect(getPlayerRaceTeams).toHaveBeenCalledTimes(1);
  });

  it('preserves live updates received before the initial load finishes', async () => {
    let resolve!: (result: Awaited<ReturnType<typeof getPlayerRaceTeams>>) => void;
    jest.mocked(getPlayerRaceTeams).mockReturnValue(new Promise(done => { resolve = done; }));
    mount();
    await act(async () => RaceTeamTopicService.raiseRaceTeamUpdated('board-map', {
      type: GameTopicMessageType.RaceTeamUpdated, playerId: 'warrior', team: 'red',
    }));
    expect(teamButton('Red team')).toHaveAttribute('aria-pressed', 'true');
    await act(async () => resolve({ success: true, data: { warrior: 'blue' } }));
    expect(teamButton('Red team')).toHaveAttribute('aria-pressed', 'true');
    expect(getPlayerRaceTeams).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['warrior', 'Blue team'], ['mage', 'Red team'], ['ranger', 'No team'],
  ])('loads the persisted team for %s', (playerId, label) => {
    mount({ ...blueSnapshot(), playerId });
    expect(teamButton(label)).toHaveAttribute('aria-pressed', 'true');
    expect(setPlayerRaceTeam).not.toHaveBeenCalled();
  });

  it('defaults to independent when the process state is missing', () => {
    mount(makePlayerSnapshot());
    expect(teamButton('No team')).toHaveAttribute('aria-pressed', 'true');
  });

  it.each([
    ['red', 'Red team'], [null, 'No team'],
  ] as const)('prefers the pending instruction (%s) over the persisted blue team', (team, label) => {
    mount({ ...blueSnapshot(), instructions: { team } });
    expect(teamButton(label)).toHaveAttribute('aria-pressed', 'true');
  });

  it.each([
    ['Red team', 'red'], ['No team', null],
  ] as const)('saves %s, preserves other instructions and updates the snapshot without mutating it', async (label, team) => {
    const snapshot = { ...blueSnapshot(), instructions: { other: 'keep' } };
    const view = mount(snapshot);
    await act(async () => fireEvent.click(teamButton(label)));
    const instructions = { other: 'keep', team };
    expect(setPlayerRaceTeam).toHaveBeenCalledWith('board', 'map', 'warrior', instructions);
    expect(onSnapshotChange).toHaveBeenCalledWith({ ...snapshot, instructions });
    expect(snapshot.instructions).toEqual({ other: 'keep' });
    view.rerender(<TeamSelectionContent {...view.props} snapshot={{ ...snapshot, instructions }} />);
    expect(teamButton(label)).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not save when the selected team is clicked again', async () => {
    mount();
    await act(async () => fireEvent.click(teamButton('Blue team')));
    expect(setPlayerRaceTeam).not.toHaveBeenCalled();
  });

  it.each(['disabled', 'no game'])('disables choices when %s', reason => {
    mount(reason === 'no game' ? makePlayerSnapshot({ gameState: null }) : blueSnapshot(), reason === 'disabled');
    for (const input of screen.getAllByRole('button')) expect(input).toBeDisabled();
    fireEvent.click(teamButton('Red team'));
    expect(setPlayerRaceTeam).not.toHaveBeenCalled();
  });

  it('disables further changes while saving and enables them after the response', async () => {
    let resolve!: (result: Awaited<ReturnType<typeof setPlayerRaceTeam>>) => void;
    jest.mocked(setPlayerRaceTeam).mockReturnValue(new Promise(done => { resolve = done; }));
    mount();
    await act(async () => fireEvent.click(teamButton('Red team')));
    expect(screen.getByRole('status')).toHaveTextContent('Saving...');
    expect(teamButton('Red team')).toBeDisabled();
    fireEvent.click(teamButton('No team'));
    expect(setPlayerRaceTeam).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ success: true, data: { team: 'red' } }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(teamButton('Red team')).toBeEnabled();
    expect(onSnapshotChange).toHaveBeenCalledTimes(1);
  });

  it.each(['server error', 'missing error', 'rejection'])('keeps the previous selection after %s and allows retry', async failure => {
    if (failure === 'rejection') jest.mocked(setPlayerRaceTeam).mockRejectedValueOnce(new Error('offline'));
    else jest.mocked(setPlayerRaceTeam).mockResolvedValueOnce({
      success: false, error: failure === 'server error' ? 'Team could not be saved' : undefined,
    });
    mount();
    await act(async () => fireEvent.click(teamButton('Red team')));
    expect(screen.getByRole('alert')).toHaveTextContent(failure === 'server error'
      ? 'Team could not be saved' : 'Unable to change team. Please try again.');
    expect(teamButton('Blue team')).toHaveAttribute('aria-pressed', 'true');
    expect(onSnapshotChange).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(teamButton('Red team')));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onSnapshotChange).toHaveBeenCalledTimes(1);
  });

  it.each(['new turn', 'new player', 'unmount'])('ignores a save response after %s', async change => {
    let resolve!: (result: Awaited<ReturnType<typeof setPlayerRaceTeam>>) => void;
    jest.mocked(setPlayerRaceTeam).mockReturnValue(new Promise(done => { resolve = done; }));
    const view = mount();
    await act(async () => fireEvent.click(teamButton('Red team')));
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
