/** @jest-environment node */
import * as store from '@/lib/store/redis-access';
import { createGame, createMonster, createNpc, createParams } from '../test-support/fixtures';
import { createLocations } from '@/lib/store/test-support/fixtures';
import { npcProcesses } from './npcs';
import { planNpcTurn } from './npc-strategy';
import { DEFAULT_TEAM_STATE, getState, saveState } from './territory-state';

jest.mock('@/lib/store/redis-access', () => ({
  commitNpcPlansInRedis: jest.fn(), getGameStateFromRedis: jest.fn(), getLocationsStateFromRedis: jest.fn(),
  lockGameStateInRedis: jest.fn(), lockLocationsStateInRedis: jest.fn(), processingLockTTL: 30000,
}));
jest.mock('./npc-strategy', () => ({ planNpcTurn: jest.fn() }));

const releaseGame = jest.fn(async () => {});
const releaseLocations = jest.fn(async () => {});

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(store.lockGameStateInRedis).mockResolvedValue(releaseGame);
  jest.mocked(store.lockLocationsStateInRedis).mockResolvedValue(releaseLocations);
});

it('loads fresh locations and persists multi-turn goals with party assignments and orders', async () => {
  const npc = createNpc({ scriptedActions: true, team: 'npc' });
  const game = createGame({ gameId: 'warlordsfire', npcs: [npc] });
  saveState(game, { teams: { npc: { ...DEFAULT_TEAM_STATE, territory: [1], monsters: ['orc'], coins: 100 } } });
  const monster = createMonster({ team: npc.team });
  const locations = createLocations({ monsters: [monster], npcs: [npc] });
  jest.mocked(store.getGameStateFromRedis).mockResolvedValue(game);
  jest.mocked(store.getLocationsStateFromRedis).mockResolvedValue(locations);
  jest.mocked(planNpcTurn).mockImplementation((params, actor, team) => {
    expect(params.monsters).toEqual([monster]);
    team.npcDecision = { type: 'expand', from: 1, location: 2 };
    params.monsters[0].masterId = actor.id;
    return { actions: [] };
  });
  await npcProcesses.executeBetweenTurns!(createParams());
  expect(getState(game).teams.npc.npcDecision).toEqual({ type: 'expand', from: 1, location: 2 });
  expect(monster.masterId).toBe(npc.id);
  expect(store.commitNpcPlansInRedis).toHaveBeenCalledWith('board', 'map', game, locations, { npc: { actions: [] } });
  expect(releaseLocations).toHaveBeenCalledTimes(1);
  expect(releaseGame).toHaveBeenCalledTimes(1);
});

it('preserves a pending hire in location state and clears independent warlord orders', async () => {
  const npc = createNpc({ scriptedActions: true, team: 'npc' });
  const hired = { ...npc, masterId: 'hero', team: 'good' };
  const game = createGame({ gameId: 'warlordsfire', npcs: [npc] });
  saveState(game, { teams: { npc: { ...DEFAULT_TEAM_STATE, npcDecision: { type: 'expand', from: 1, location: 2 } } } });
  const party = createMonster({ masterId: npc.id, team: npc.team });
  const locations = createLocations({ monsters: [party], npcs: [hired] });
  jest.mocked(store.getGameStateFromRedis).mockResolvedValue(game);
  jest.mocked(store.getLocationsStateFromRedis).mockResolvedValue(locations);
  await npcProcesses.executeBetweenTurns!(createParams());
  expect(planNpcTurn).not.toHaveBeenCalled();
  expect(locations.npcs[0].masterId).toBe('hero');
  expect(party.masterId).toBeUndefined();
  expect(store.commitNpcPlansInRedis).toHaveBeenCalledWith('board', 'map', game, locations, { npc: null });
});
