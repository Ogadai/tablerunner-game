import { getAvailableFastTravelLocations, getLocationState } from './locationState';
import { getGameStateFromRedis, getLocationsStateFromRedis } from './redis-access';
import { createGame, createLocations, createNpc } from './test-support/fixtures';

jest.mock('./redis-access', () => ({ getLocationsStateFromRedis: jest.fn(), getGameStateFromRedis: jest.fn() }));
jest.mock('../games/games', () => ({ games: [{ id: 'test-game', locations: [
  { id: 1, description: '', move: [{ id: 2, direction: 'e' }] }, { id: 2, description: '', move: [] },
] }] }));
beforeEach(() => jest.resetAllMocks());

it('returns team-aware travel destinations using current NPC state', async () => {
  const game = createGame({ visited: [1, 2] });
  game.players[0].location.move = [{ id: 2, direction: 'e' }];
  const npc = createNpc({ team: 'red', location: { id: 2, description: '', move: [] } });
  jest.mocked(getGameStateFromRedis).mockResolvedValue(game);
  jest.mocked(getLocationsStateFromRedis).mockResolvedValue(createLocations({ npcs: [npc] }));
  await expect(getAvailableFastTravelLocations('board', 'map', 'hero')).resolves.toEqual({ success: true, data: [1] });
  npc.team = game.players[0].team;
  await expect(getAvailableFastTravelLocations('board', 'map', 'hero')).resolves.toEqual({ success: true, data: [1, 2] });
});

it('selects monsters, items and NPCs at the requested location, including dead entities', async () => {
  const localMonster = { id: 'rat', type: 'rat', health: 0, location: 1, team: 'monster' };
  const localItem = { id: 'potion', type: 'healingPotion', location: 1 };
  const localNpc = createNpc();
  const state = createLocations({
    monsters: [localMonster, { ...localMonster, id: 'other', location: 2 }],
    items: [localItem, { ...localItem, id: 'other', location: 2 }],
    npcs: [localNpc, createNpc({ id: 'other', location: { id: 2, description: '', move: [] } })],
  });
  jest.mocked(getLocationsStateFromRedis).mockResolvedValue(state);
  await expect(getLocationState('board', 'map', 1)).resolves.toEqual({ success: true, data: { monsters: [localMonster], items: [localItem], npcs: [localNpc] } });
  expect(getLocationsStateFromRedis).toHaveBeenCalledWith('board', 'map');
  expect(state.monsters).toHaveLength(2);
});

it('supports empty locations and older state without NPCs', async () => {
  jest.mocked(getLocationsStateFromRedis).mockResolvedValue(createLocations({ npcs: undefined }));
  await expect(getLocationState('board', 'map', 99)).resolves.toEqual({ success: true, data: { monsters: [], items: [], npcs: [] } });
});

it('reports storage failure', async () => {
  jest.mocked(getLocationsStateFromRedis).mockRejectedValue(new Error('Read failed'));
  await expect(getLocationState('board', 'map', 1)).resolves.toEqual({ success: false, error: 'Read failed' });
});
