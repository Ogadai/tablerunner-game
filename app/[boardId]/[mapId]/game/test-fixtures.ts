import type { CharacterListEntry } from '@/lib/games/types';
import type { GameState, PlayerState } from '@/lib/store/types';

export function makeCharacter(id = 'warrior'): CharacterListEntry {
  return {
    id, prompt: `Create ${id}`, description: `${id} description`,
    iconXY: { x: 1, y: 2 }, rgbColour: 'ff0000',
    characterStats: { strength: 1, skill: 1, reactions: 1, resiliance: 1, intelligence: 1 },
    equipment: [], spells: [],
  };
}

export function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: 'warrior', name: 'Test Warrior', health: 10, magic: 2,
    location: { id: 1, description: 'Start', move: [] },
    rgbColour: 'ff0000', characterStats: makeCharacter().characterStats,
    level: 1, points: 0, availableStats: 0, coins: 0,
    spells: [], equipment: [], equipped: {}, ...overrides,
  };
}

export function makeGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    gameId: 'game-1', name: 'Test Game', turn: 1,
    characters: [makeCharacter(), makeCharacter('mage')], players: [], npcs: [],
    visited: [], stores: [], portals: [], visitedPortals: [],
    counters: { monsterId: 0, itemId: 0 }, leds: [], processState: {}, ...overrides,
  };
}
