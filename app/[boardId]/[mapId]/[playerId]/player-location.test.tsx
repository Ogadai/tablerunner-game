import type { ComponentProps } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { addPlayerAction, removePlayerAction } from '@/lib/store/playerActionsState';
import { getLocationState } from '@/lib/store/locationState';
import locationTopic from '@/app/message-bus/location-topic-service';
import { PlayerActionType, type PlayerActionsState } from '@/lib/store/types';
import PlayerLocation from './player-location';
import sync from './player-stats-sync.service';
import { makeGameState, makePlayer as makeTestPlayer, makeStats } from './test-fixtures';

function makePlayer(overrides: Parameters<typeof makeTestPlayer>[0] = {}) {
  return makeTestPlayer({ id: 'barbarian', ...overrides });
}

jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('sweetalert2', () => ({ __esModule: true, default: { fire: jest.fn() } }));
jest.mock('@/lib/store/playerActionsState', () => ({ addPlayerAction: jest.fn(), removePlayerAction: jest.fn() }));
jest.mock('@/lib/store/locationState', () => ({ getLocationState: jest.fn() }));
jest.mock('@/app/message-bus/location-topic-service', () => ({ __esModule: true, default: { subscribe: jest.fn() } }));
jest.mock('./player-stats-sync.service', () => ({ __esModule: true, emptyPlayerStats: {}, default: {
  updatePlayer: jest.fn(), subscribe: jest.fn(), updateActionsState: jest.fn(),
} }));
jest.mock('./player-location-list', () => ({ __esModule: true, default: () => null }));
jest.mock('./player-spells', () => ({ __esModule: true, default: () => null }));
jest.mock('./player-store', () => ({ __esModule: true, default: () => <span>Store available</span> }));
jest.mock('./player-portal', () => ({ __esModule: true, default: () => <span>Portal available</span> }));
jest.mock('./fast-travel', () => ({ __esModule: true, default: () => null }));
jest.mock('./player-video', () => ({ __esModule: true, default: () => null }));

describe('PlayerLocation', () => {
  const push = jest.fn();
  const disposeStats = jest.fn();
  const disposeLocation = jest.fn();
  let onLocation: Parameters<typeof locationTopic.subscribe>[1];
  let onStats: Parameters<typeof sync.subscribe>[0];

  beforeEach(() => {
    jest.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    jest.mocked(getLocationState).mockResolvedValue({ success: true, data: { monsters: [], items: [], npcs: [] } });
    jest.mocked(addPlayerAction).mockResolvedValue({ success: true, data: { actions: [] } });
    jest.mocked(removePlayerAction).mockResolvedValue({ success: true, data: { actions: [] } });
    jest.mocked(sync.subscribe).mockImplementation(callback => { onStats = callback; return disposeStats; });
    jest.mocked(locationTopic.subscribe).mockImplementation((_topic, callback) => { onLocation = callback; return disposeLocation; });
  });

  async function setup(overrides: Partial<ComponentProps<typeof PlayerLocation>> = {}, actions: PlayerActionsState = { actions: [] }) {
    const player = overrides.gameState?.players[0] || makePlayer({
      location: { id: 1, description: 'Start', move: [{ id: 2, direction: 'n' }, { id: 3, direction: 's' }] },
    });
    const props = { boardId: 'board', mapId: 'map', playerId: 'barbarian', gameState: makeGameState({ players: [player] }),
      isPlayerReady: false, processing: false, endTurnAction: jest.fn(), ...overrides };
    const view = render(<PlayerLocation {...props} />);
    await act(async () => onStats(makeStats({ health: player.health }), actions, null, player));
    return { ...view, props, player };
  }

  it('redirects when the player is no longer in the game', () => {
    render(<PlayerLocation boardId="board" mapId="map" playerId="barbarian" gameState={makeGameState()}
      isPlayerReady={false} processing={false} endTurnAction={jest.fn()} />);
    expect(push).toHaveBeenCalledWith('/board/map');
    expect(getLocationState).not.toHaveBeenCalled();
  });

  it('queues a move with the next action ID and ends the turn after saving', async () => {
    const { props } = await setup({}, { actions: [{ id: 7, type: PlayerActionType.ReadScroll, description: 'Learn' }] });
    fireEvent.click(screen.getByRole('button', { name: 'north' }));
    await waitFor(() => expect(props.endTurnAction).toHaveBeenCalledWith('n'));
    expect(addPlayerAction).toHaveBeenCalledWith('board', 'map', 'barbarian', {
      id: 8, type: PlayerActionType.Move, description: 'Go North', direction: 'n',
    });
    expect(sync.updateActionsState).toHaveBeenCalledWith({ actions: [] });
  });

  it('blocks advancing past living enemies but allows retreat', async () => {
    jest.mocked(getLocationState).mockResolvedValue({ success: true, data: {
      monsters: [{ id: 'goblin-1', type: 'goblin', location: 1, health: 10 }], items: [], npcs: [],
    } });
    const player = makePlayer({ retreatDirection: 's', location: { id: 1, description: 'Start',
      move: [{ id: 2, direction: 'n' }, { id: 3, direction: 's' }] } });
    const { props } = await setup({ gameState: makeGameState({ players: [player] }) });
    fireEvent.click(screen.getByRole('button', { name: 'north' }));
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: 'Movement blocked!' }));
    expect(addPlayerAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'south' }));
    await waitFor(() => expect(props.endTurnAction).toHaveBeenCalledWith('s'));
  });

  it('removes a queued travel action when cancelling ready', async () => {
    const { props } = await setup({ isPlayerReady: true }, { actions: [
      { id: 3, type: PlayerActionType.Portal, description: 'Portal' },
    ] });
    fireEvent.click(screen.getByRole('button', { name: /Not Ready!/ }));
    await waitFor(() => expect(props.endTurnAction).toHaveBeenCalledTimes(1));
    expect(removePlayerAction).toHaveBeenCalledWith('board', 'map', 'barbarian', 3);
    expect(sync.updateActionsState).toHaveBeenCalledWith({ actions: [] });
  });

  it('removes a selected action and synchronizes the remaining queue', async () => {
    await setup({}, { actions: [{ id: 4, type: PlayerActionType.Attack, description: 'Attack Goblin' }] });
    fireEvent.click(screen.getByRole('button', { name: 'delete_forever' }));
    await waitFor(() => expect(sync.updateActionsState).toHaveBeenCalledWith({ actions: [] }));
    expect(removePlayerAction).toHaveBeenCalledWith('board', 'map', 'barbarian', 4);
  });

  it('prevents movement and queue edits while processing', async () => {
    const { props } = await setup({ processing: true }, { actions: [
      { id: 4, type: PlayerActionType.Attack, description: 'Attack Goblin' },
    ] });
    for (const name of ['north', 'south', 'Stay', 'delete_forever']) {
      const button = screen.getByRole('button', { name });
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    expect(addPlayerAction).not.toHaveBeenCalled();
    expect(removePlayerAction).not.toHaveBeenCalled();
    expect(props.endTurnAction).not.toHaveBeenCalled();
  });

  it('shows the specific blocked-route message even without enemies', async () => {
    await setup({ gameState: makeGameState({ players: [makePlayer({ location: {
      id: 1, description: 'Gate', move: [{ id: 2, direction: 'n', blockDescription: 'A key is required.' }],
    } })] }) });
    fireEvent.click(screen.getByRole('button', { name: 'north' }));
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ text: 'A key is required.' }));
    expect(addPlayerAction).not.toHaveBeenCalled();
  });

  it('uses location overrides and renders local store and portal options', async () => {
    await setup({ gameState: makeGameState({ players: [makePlayer()], stores: [1], portals: [1],
      locationOverrides: [{ id: 1, description: 'The gate is open' }] }) });
    expect(screen.getByText('The gate is open')).toBeInTheDocument();
    expect(screen.getByText('Store available')).toBeInTheDocument();
    expect(screen.getByText('Portal available')).toBeInTheDocument();
  });

  it.each([0, 2])('permits respawning only when the countdown reaches zero (%s)', async respawnTurns => {
    const { props } = await setup({ gameState: makeGameState({ players: [makePlayer({ health: 0, respawnTurns })] }) });
    const button = screen.getByRole('button', { name: 'Respawn' });
    if (respawnTurns > 0) {
      expect(button).toBeDisabled();
      expect(screen.getByText('in 2 turns')).toBeInTheDocument();
    } else {
      fireEvent.click(button);
      await waitFor(() => expect(props.endTurnAction).toHaveBeenCalledTimes(1));
      expect(addPlayerAction).toHaveBeenCalledWith('board', 'map', 'barbarian', {
        id: 0, type: PlayerActionType.Respawn, description: 'Respawn',
      });
    }
  });

  it('refreshes only matching location events and disposes subscriptions', async () => {
    const { unmount } = await setup();
    expect(getLocationState).toHaveBeenCalledTimes(1);
    await act(async () => onLocation(2));
    expect(getLocationState).toHaveBeenCalledTimes(1);
    await act(async () => onLocation(1));
    expect(getLocationState).toHaveBeenCalledTimes(2);
    unmount();
    expect(disposeStats).toHaveBeenCalledTimes(1);
    expect(disposeLocation).toHaveBeenCalledTimes(1);
  });
});
