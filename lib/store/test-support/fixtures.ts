import type { AllLocationsState, GameState, NPCState, PlayerState } from '../types';

export function createPlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: 'hero', name: 'Test Hero', location: { id: 1, description: 'Start', move: [] },
    health: 20, magic: 10, spells: [], equipment: [{ id: 'sword', type: 'swordRusty' }],
    equipped: { weapon: 'sword' }, rgbColour: '#ffffff',
    characterStats: { strength: 6, skill: 12, reactions: 10, resiliance: 20, intelligence: 10 },
    baseStats: { attack: 6, damage: 6, defence: 10, magic: 10, health: 20, speed: 10 },
    level: 1, points: 0, availableStats: 5, coins: 20, ...overrides,
  };
}

export function createNpc(overrides: Partial<NPCState> = {}): NPCState {
  return { ...createPlayer(), id: 'npc', masterId: null, hireCost: 10, iconXY: { x: 0, y: 0 }, ...overrides };
}

export function createGame(overrides: Partial<GameState> = {}): GameState {
  return {
    gameId: 'test-game', turn: 3, name: 'Test game', characters: [], players: [createPlayer()],
    npcs: [], visited: [1], stores: [1], portals: [], visitedPortals: [],
    counters: { itemId: 0, monsterId: 0 }, leds: [], processState: {}, ...overrides,
  };
}

export function createLocations(overrides: Partial<AllLocationsState> = {}): AllLocationsState {
  return { monsters: [], items: [], coins: [], blockedMoves: [], npcs: [], ...overrides };
}

export function createSave() {
  const game = createGame();
  return {
    schemaVersion: 1 as const,
    metadata: {
      id: '12345678-1234-4234-8234-123456789abc', boardId: 'board', mapId: 'map',
      saveName: 'My save', savedAt: '2026-09-25T12:00:00.000Z',
      gameId: game.gameId, playerCount: game.players.length, turn: game.turn,
    },
    redisState: { 'game:board:map': game },
  };
}
