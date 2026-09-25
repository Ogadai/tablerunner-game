import {
  createNewGameState, createPlayerForGame, deleteGameState, deletePlayerFromGame,
  getBoardSettings, getGameState, setBoardSettings,
} from './gameState';
import * as redis from './redis-access';
import { GameState } from './types';
import { games } from '../games/games';
import { characters } from '../games/characters';
import { populateItemsForMap } from '../runner/populate-items';
import { setupProcesses } from '../runner/game-processes';
import { createStoreInventoryState } from './playerInventory';
import { pickCharacterName } from '../games/character-names';

jest.mock('./redis-access', () => ({
  getGameStateFromRedis: jest.fn(), setGameStateInRedis: jest.fn(),
  deleteGameStateFromRedis: jest.fn(), setLocationsStateInRedis: jest.fn(),
  getBoardSettingsFromRedis: jest.fn(), setBoardSettingsFromRedis: jest.fn(),
}));
jest.mock('../runner/populate-items', () => ({ populateItemsForMap: jest.fn() }));
jest.mock('../runner/game-processes', () => ({ setupProcesses: jest.fn() }));
jest.mock('./playerInventory', () => ({ createStoreInventoryState: jest.fn() }));
jest.mock('../games/character-names', () => ({ pickCharacterName: jest.fn() }));

const mockRedis = jest.mocked(redis);
const game = games[0];
function createState(): GameState {
  return {
    gameId: game.id, turn: 0, name: 'Test game', characters: game.characters,
    players: [], npcs: [], visited: [game.startLocation], stores: [], portals: [],
    visitedPortals: [], counters: { itemId: 0, monsterId: 0 }, leds: [], processState: {},
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  mockRedis.getGameStateFromRedis.mockResolvedValue(createState());
  jest.mocked(populateItemsForMap).mockResolvedValue([]);
  jest.mocked(pickCharacterName).mockReturnValue('Test Hero');
});

describe('game and board persistence', () => {
  it('returns the stored game for the requested board and map', async () => {
    const state = createState();
    mockRedis.getGameStateFromRedis.mockResolvedValue(state);
    await expect(getGameState('board', 'map')).resolves.toEqual({ success: true, data: state });
    expect(mockRedis.getGameStateFromRedis).toHaveBeenCalledWith('board', 'map');
  });

  it('returns board settings', async () => {
    mockRedis.getBoardSettingsFromRedis.mockResolvedValue({ brightness: 25 });
    await expect(getBoardSettings('board', 'map')).resolves.toEqual({ success: true, data: { brightness: 25 } });
    expect(mockRedis.getBoardSettingsFromRedis).toHaveBeenCalledWith('board', 'map');
  });

  it('saves board settings', async () => {
    await expect(setBoardSettings('board', 'map', { brightness: 0 })).resolves.toEqual({ success: true });
    expect(mockRedis.setBoardSettingsFromRedis).toHaveBeenCalledWith('board', 'map', { brightness: 0 });
  });

  it('deletes the requested game', async () => {
    await expect(deleteGameState('board', 'map')).resolves.toEqual({ success: true });
    expect(mockRedis.deleteGameStateFromRedis).toHaveBeenCalledWith('board', 'map');
  });

  it.each([
    ['read game', () => getGameState('board', 'map'), mockRedis.getGameStateFromRedis],
    ['read settings', () => getBoardSettings('board', 'map'), mockRedis.getBoardSettingsFromRedis],
    ['write settings', () => setBoardSettings('board', 'map', { brightness: 50 }), mockRedis.setBoardSettingsFromRedis],
    ['delete game', () => deleteGameState('board', 'map'), mockRedis.deleteGameStateFromRedis],
  ] as const)('reports failure to %s', async (_name, action, dependency) => {
    dependency.mockRejectedValue(new Error('Storage unavailable'));
    await expect(action()).resolves.toEqual({ success: false, error: 'Storage unavailable' });
  });
});

describe('createNewGameState', () => {
  it('rejects unknown games before initialization or persistence', async () => {
    await expect(createNewGameState('board', 'map', 'missing')).resolves.toEqual({
      success: false, error: "Couldn't find game id missing",
    });
    expect(populateItemsForMap).not.toHaveBeenCalled();
    expect(setupProcesses).not.toHaveBeenCalled();
    expect(mockRedis.setGameStateInRedis).not.toHaveBeenCalled();
  });

  it('initializes and persists the game, locations and every store', async () => {
    const items = [{ id: 'item-1', type: 'healingPotion', location: game.startLocation }];
    jest.mocked(populateItemsForMap).mockResolvedValue(items);
    jest.mocked(setupProcesses).mockImplementation(async params => {
      params.gameState.processState.test = { initialized: true };
      params.monsters.push({ id: 'monster-1', type: 'rat', health: 5, location: game.startLocation });
    });
    const result = await createNewGameState('board', 'map', game.id);
    expect(result).toEqual({ success: true, data: expect.objectContaining({
      gameId: game.id, name: `${game.id} on board board and map map`, turn: 0,
      players: [], npcs: [], characters: game.characters, visited: [game.startLocation],
      stores: Object.keys(game.storeItems).map(Number), portals: game.portalLocations ?? [],
      visitedPortals: game.portalLocations?.includes(game.startLocation) ? [game.startLocation] : [],
      counters: { itemId: 0, monsterId: 0 }, processState: { test: { initialized: true } },
    }) });
    expect(populateItemsForMap).toHaveBeenCalledWith(result.data, 'map');
    expect(setupProcesses).toHaveBeenCalledWith(expect.objectContaining({ boardId: 'board', mapId: 'map', messages: {}, items }));
    expect(mockRedis.setGameStateInRedis).toHaveBeenCalledWith('board', 'map', result.data);
    expect(mockRedis.setLocationsStateInRedis).toHaveBeenCalledWith('board', 'map', {
      items, monsters: [{ id: 'monster-1', type: 'rat', health: 5, location: game.startLocation }],
      coins: [], blockedMoves: [], npcs: [],
    });
    expect(createStoreInventoryState).toHaveBeenCalledTimes(Object.keys(game.storeItems).length);
    for (const [location, inventory] of Object.entries(game.storeItems)) {
      expect(createStoreInventoryState).toHaveBeenCalledWith('board', 'map', Number(location), inventory);
    }
  });

  it('stops initialization writes when saving the game fails', async () => {
    mockRedis.setGameStateInRedis.mockRejectedValue(new Error('Write failed'));
    await expect(createNewGameState('board', 'map', game.id)).resolves.toEqual({ success: false, error: 'Write failed' });
    expect(mockRedis.setLocationsStateInRedis).not.toHaveBeenCalled();
    expect(createStoreInventoryState).not.toHaveBeenCalled();
  });

  it('reports location persistence failure without creating stores', async () => {
    mockRedis.setLocationsStateInRedis.mockRejectedValue(new Error('Locations failed'));
    await expect(createNewGameState('board', 'map', game.id)).resolves.toEqual({ success: false, error: 'Locations failed' });
    expect(createStoreInventoryState).not.toHaveBeenCalled();
  });

  it('reports store initialization failure', async () => {
    jest.mocked(createStoreInventoryState).mockRejectedValue(new Error('Store failed'));
    await expect(createNewGameState('board', 'map', game.id)).resolves.toEqual({ success: false, error: 'Store failed' });
  });
});

describe('player creation and deletion', () => {
  it('creates a character with equipment, full health/magic and starting resources', async () => {
    const state = createState();
    mockRedis.getGameStateFromRedis.mockResolvedValue(state);
    await expect(createPlayerForGame('board', 'map', 'mage')).resolves.toEqual({ success: true });
    const saved = mockRedis.setGameStateInRedis.mock.calls[0][2];
    const player = saved.players[0];
    expect(player).toMatchObject({ id: 'mage', name: 'Test Hero', location: { id: game.startLocation },
      characterStats: characters.mage.characterStats, spells: characters.mage.spells,
      level: 1, points: 0, availableStats: 5, coins: 20,
    });
    expect(player.health).toBe(player.baseStats!.health);
    expect(player.magic).toBe(player.baseStats!.magic);
    expect(player.equipment.map(item => item.type)).toEqual(characters.mage.equipment.map(item => item.id));
    expect(new Set(player.equipment.map(item => item.id)).size).toBe(player.equipment.length);
    expect(player.equipped.weapon).toBe(player.equipment[0].id);
    expect(player.characterStats).not.toBe(characters.mage.characterStats);
    expect(player.spells).not.toBe(characters.mage.spells);
    expect(state.players).toEqual([]);
    expect(mockRedis.setGameStateInRedis).toHaveBeenCalledWith('board', 'map', saved);
  });

  it('rejects a missing game', async () => {
    mockRedis.getGameStateFromRedis.mockResolvedValue(null as unknown as GameState);
    await expect(createPlayerForGame('board', 'map', 'mage')).resolves.toEqual({ success: false, error: "Couldn't find Game state for game" });
    expect(mockRedis.setGameStateInRedis).not.toHaveBeenCalled();
  });

  it('rejects an unknown character', async () => {
    await expect(createPlayerForGame('board', 'map', 'missing')).resolves.toEqual({ success: false, error: "Couldn't find character for missing" });
    expect(mockRedis.setGameStateInRedis).not.toHaveBeenCalled();
  });

  it('rejects duplicate players without saving again', async () => {
    await createPlayerForGame('board', 'map', 'mage');
    mockRedis.getGameStateFromRedis.mockResolvedValue(mockRedis.setGameStateInRedis.mock.calls[0][2]);
    mockRedis.setGameStateInRedis.mockClear();
    await expect(createPlayerForGame('board', 'map', 'mage')).resolves.toEqual({ success: false, error: 'Player mage has already been created' });
    expect(mockRedis.setGameStateInRedis).not.toHaveBeenCalled();
  });

  it('removes only the requested player and preserves other game state', async () => {
    await createPlayerForGame('board', 'map', 'mage');
    const state = mockRedis.setGameStateInRedis.mock.calls[0][2];
    state.players.push({ ...state.players[0], id: 'other' });
    mockRedis.getGameStateFromRedis.mockResolvedValue(state);
    mockRedis.setGameStateInRedis.mockClear();
    await expect(deletePlayerFromGame('board', 'map', 'mage')).resolves.toEqual({ success: true });
    expect(mockRedis.setGameStateInRedis).toHaveBeenCalledWith('board', 'map', { ...state, players: [state.players[1]] });
    expect(state.players).toHaveLength(2);
  });

  it.each([createPlayerForGame, deletePlayerFromGame])('reports player persistence errors (%#)', async action => {
    mockRedis.setGameStateInRedis.mockRejectedValue(new Error('Write failed'));
    await expect(action('board', 'map', 'mage')).resolves.toEqual({ success: false, error: 'Write failed' });
  });

  it.each([createPlayerForGame, deletePlayerFromGame])('reports player read errors (%#)', async action => {
    mockRedis.getGameStateFromRedis.mockRejectedValue(new Error('Read failed'));
    await expect(action('board', 'map', 'mage')).resolves.toEqual({ success: false, error: 'Read failed' });
  });
});
