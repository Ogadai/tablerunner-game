import type { ComponentProps } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { addPlayerAction, removePlayerAction } from '@/lib/store/playerActionsState';
import { getLocationState } from '@/lib/store/locationState';
import locationTopic from '@/app/message-bus/location-topic-service';
import { PlayerActionType, type LocationState, type PlayerActionsState } from '@/lib/store/types';
import PlayerLocation from './player-location';
import PlayerLocationList from './player-location-list';
import PlayerPortal from './player-portal';
import FastTravel from './fast-travel';
import WarlordRecruitment from './warlords-of-fire/warlord-recruitment';
import { createMonster, createNpc } from '@/lib/runner/test-support/fixtures';
import sync from './player-stats-sync.service';
import { makeGameState, makePlayer as makeTestPlayer, makeStats } from './test-fixtures';
import { makePlayerSnapshot } from '../game/test-fixtures';

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
jest.mock('./player-location-list', () => ({ __esModule: true, default: jest.fn(() => null) }));
jest.mock('./player-spells', () => ({ __esModule: true, default: () => null }));
jest.mock('./player-store', () => ({ __esModule: true, default: () => <span>Store available</span> }));
jest.mock('./player-portal', () => ({ __esModule: true, default: jest.fn(() => <span>Portal available</span>) }));
jest.mock('./fast-travel', () => ({ __esModule: true, default: jest.fn(() => null) }));
jest.mock('./player-video', () => ({ __esModule: true, default: () => null }));
jest.mock('./warlords-of-fire/warlord-recruitment', () => ({ __esModule: true, default: jest.fn(() =>
  <section aria-label="Recruitment queue" />
) }));

describe('PlayerLocation', () => {
  const push = jest.fn();
  const disposeStats = jest.fn();
  const disposeLocation = jest.fn();
  let onLocation: Parameters<typeof locationTopic.subscribe>[1];
  let onStats: Parameters<typeof sync.subscribe>[0];
  let location: LocationState;

  beforeEach(() => {
    location = { monsters: [], items: [], npcs: [] };
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
    const snapshot = makePlayerSnapshot({ playerId: props.playerId, gameState: props.gameState, location, actions });
    const view = render(<PlayerLocation snapshot={snapshot} {...props} />);
    await act(async () => onStats(makeStats({ health: player.health }), actions, null, player));
    return { ...view, props, player };
  }

  it('redirects when the player is no longer in the game', () => {
    render(<PlayerLocation boardId="board" mapId="map" playerId="barbarian" gameState={makeGameState()}
      isPlayerReady={false} processing={false} endTurnAction={jest.fn()} />);
    expect(push).toHaveBeenCalledWith('/board/map');
    expect(getLocationState).not.toHaveBeenCalled();
  });

  it.each(['cauldronfire', 'racefire'])('hides recruitment in %s games', async gameId => {
    await setup({ gameState: makeGameState({ gameId, players: [makePlayer()] }) });
    expect(screen.queryByRole('region', { name: 'Recruitment queue' })).not.toBeInTheDocument();
    expect(WarlordRecruitment).not.toHaveBeenCalled();
  });

  it('shows recruitment in warlordsfire even when no actions are queued', async () => {
    await setup({ gameState: makeGameState({ gameId: 'warlordsfire', players: [makePlayer()] }) });
    expect(screen.getByRole('region', { name: 'Recruitment queue' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Actions' })).not.toBeInTheDocument();
  });

  it.each([false, true])('places recruitment before Actions and passes its context (processing: %s)', async processing => {
    const gameState = makeGameState({ gameId: 'warlordsfire', players: [makePlayer({ id: 'ranger' })] });
    const { props } = await setup({ boardId: 'warlord-board', mapId: 'warlord-map', playerId: 'ranger', gameState, processing }, {
      actions: [{ id: 4, type: PlayerActionType.Attack, description: 'Attack Goblin' }],
    });
    expect(jest.mocked(WarlordRecruitment).mock.calls.at(-1)![0]).toEqual({
      boardId: props.boardId,
      mapId: props.mapId,
      playerId: props.playerId,
      gameState,
      availableCoins: gameState.players[0].coins,
      processing,
    });
    const recruitment = screen.getByRole('region', { name: 'Recruitment queue' });
    const actions = screen.getByRole('heading', { name: 'Actions' });
    expect(recruitment.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
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
    location = {
      monsters: [{ id: 'goblin-1', type: 'goblin', location: 1, health: 10, team: 'monster' }], items: [], npcs: [],
    };
    const player = makePlayer({ retreatDirection: 's', location: { id: 1, description: 'Start',
      move: [{ id: 2, direction: 'n' }, { id: 3, direction: 's' }] } });
    const { props } = await setup({ gameState: makeGameState({ players: [player] }) });
    fireEvent.click(screen.getByRole('button', { name: 'north' }));
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: 'Movement blocked!' }));
    expect(addPlayerAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'south' }));
    await waitFor(() => expect(props.endTurnAction).toHaveBeenCalledWith('s'));
  });

  it('classifies mixed teams and blocks travel for an enemy player or NPC', async () => {
    const player = makePlayer();
    const ally = makePlayer({ id: 'ranger' });
    const enemy = makePlayer({ id: 'mage', team: 'red' });
    location = {
      items: [], monsters: [createMonster({ id: 'ally-monster', team: player.team }), createMonster()],
      npcs: [createNpc({ id: 'ally-npc' }), createNpc({ id: 'enemy-npc', team: 'red' })],
    };
    await setup({ gameState: makeGameState({ players: [player, ally, enemy], portals: [1] }) });
    const entities = jest.mocked(PlayerLocationList).mock.calls.at(-1)![0].entities;
    expect(Object.fromEntries(entities.map(entity => [entity.id, entity.className]))).toEqual({
      barbarian: 'self', ranger: 'friendly', mage: 'enemy', 'ally-npc': 'npc', 'enemy-npc': 'enemy', 'ally-monster': 'npc', rat: 'enemy',
    });
    expect(jest.mocked(PlayerPortal).mock.calls.at(-1)![0].hasLivingEnemies).toBe(true);
    expect(jest.mocked(FastTravel).mock.calls.at(-1)![0].hasLivingEnemies).toBe(true);
  });

  it('passes equipment-enhanced NPC maximum health to the location health bars', async () => {
    location.npcs = [createNpc({
      health: 25,
      equipment: [{ id: 'staff', type: 'staffEarth' }, { id: 'ring', type: 'ringRuby' }],
      equipped: { weapon: 'staff' },
    })];
    await setup();
    const entities = jest.mocked(PlayerLocationList).mock.calls.at(-1)![0].entities;
    expect(entities.find(entity => entity.id === location.npcs[0].id))
      .toMatchObject({ health: 25, maxHealth: 30 });
  });

  it('blocks rapid attacks while saving and checks the returned queue before another attack', async () => {
    await setup();
    let finish!: (result: Awaited<ReturnType<typeof addPlayerAction>>) => void;
    jest.mocked(addPlayerAction).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const submit = jest.mocked(PlayerLocationList).mock.calls.at(-1)![0].addNewAction;
    const attack = { type: PlayerActionType.Attack, description: 'Attack', target: 'enemy' };
    let pending!: Promise<void>;
    await act(async () => {
      pending = submit(attack);
      await submit(attack);
    });
    expect(addPlayerAction).toHaveBeenCalledTimes(1);

    await act(async () => {
      finish({ success: true, data: { actions: [{ ...attack, id: 0 }] } });
      await pending;
      await submit(attack);
    });
    expect(addPlayerAction).toHaveBeenCalledTimes(1);
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Not enough Action Points left this turn.',
    }));
  });

  it('rejects a spell when queued spells have used the remaining magic', async () => {
    const { player } = await setup();
    const cast = { id: 0, type: PlayerActionType.Cast, description: 'Cast', spellId: 'spiritArrow' };
    await act(async () => onStats(makeStats({ magic: 3, actionPointsTotal: 100 }), { actions: [cast] }, null, player));
    const submit = jest.mocked(PlayerLocationList).mock.calls.at(-1)![0].addNewAction;
    await act(async () => { await submit(cast); });
    expect(addPlayerAction).not.toHaveBeenCalled();
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ text: 'Not enough magic left this turn.' }));
  });

  it('allows another combat submission after a failed save without updating the queue', async () => {
    await setup();
    jest.mocked(addPlayerAction).mockResolvedValueOnce({ success: false, error: 'Locked' });
    const submit = jest.mocked(PlayerLocationList).mock.calls.at(-1)![0].addNewAction;
    const attack = { type: PlayerActionType.Attack, description: 'Attack', target: 'enemy' };
    await act(async () => { await submit(attack); });
    expect(sync.updateActionsState).not.toHaveBeenCalled();
    await act(async () => { await submit(attack); });
    expect(addPlayerAction).toHaveBeenCalledTimes(2);
  });

  it('permits movement, portals and running with an allied monster', async () => {
    location = {
      items: [], npcs: [], monsters: [createMonster({ team: 'good' })],
    };
    const player = makePlayer({ location: { id: 1, description: '', move: [{ id: 2, direction: 'n' }] } });
    await setup({ gameState: makeGameState({ players: [player], portals: [1] }) });
    expect(jest.mocked(PlayerPortal).mock.calls.at(-1)![0].hasLivingEnemies).toBe(false);
    expect(jest.mocked(FastTravel).mock.calls.at(-1)![0].hasLivingEnemies).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'north' }));
    await waitFor(() => expect(addPlayerAction).toHaveBeenCalled());
  });

  it('updates party membership locally without fetching location state or changing the snapshot', async () => {
    const monster = createMonster({ team: 'good' });
    location = { monsters: [monster], items: [], npcs: [] };
    const { player } = await setup();
    const editParty = jest.mocked(PlayerLocationList).mock.calls.at(-1)![0].onPartyChanged;

    await act(async () => editParty(monster.id, true));
    expect(jest.mocked(PlayerLocationList).mock.calls.at(-1)![0].monsters[0].masterId).toBe(player.id);
    expect(monster.masterId).toBeUndefined();

    await act(async () => editParty(monster.id, false));
    expect(jest.mocked(PlayerLocationList).mock.calls.at(-1)![0].monsters[0].masterId).toBeUndefined();
    expect(getLocationState).not.toHaveBeenCalled();
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
    expect(getLocationState).not.toHaveBeenCalled();
    await act(async () => onLocation(2));
    expect(getLocationState).not.toHaveBeenCalled();
    await act(async () => onLocation(1));
    expect(getLocationState).toHaveBeenCalledTimes(1);
    unmount();
    expect(disposeStats).toHaveBeenCalledTimes(1);
    expect(disposeLocation).toHaveBeenCalledTimes(1);
  });
});
