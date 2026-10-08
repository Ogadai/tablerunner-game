import { CharacterListEntry } from '@/lib/games/types';
import { GameState } from '@/lib/store/types';
import { GameCreation, StarterPlayer } from '../types';
import { getState, saveState, DEFAULT_TEAM_STATE } from './territory-state';
import { playerMonsters } from './monsters';

// Define Warlords of Fire starting values.
const INITIAL_AVAILABLE_STATS = 12;
const INITIAL_COINS = 200;
const START_LOCATIONS = [10, 231, 121, 100];

export function createStarterPlayer(characterDef: CharacterListEntry, gameState: GameState): StarterPlayer {
  const state = getState(gameState);

  const availableLocations = START_LOCATIONS.filter(loc => !gameState.players.some(player => player.startLocation === loc));
  const location = availableLocations[Math.floor(Math.random() * availableLocations.length)] || START_LOCATIONS[0];

  const availableMosters = playerMonsters.filter(m => 
    !Object.keys(state.teams).some(team => state.teams[team].monsters.includes(m))
  );
  const monster = availableMosters[Math.floor(Math.random() * availableMosters.length)];

  state.teams[characterDef.id] = {
    ...DEFAULT_TEAM_STATE,
    territory: [location],
    colour: characterDef.rgbColour,
    monsters: [monster],
  };

  saveState(gameState, state);

  return {
    location,
    level: 1,
    availableStats: INITIAL_AVAILABLE_STATS,
    coins: INITIAL_COINS,
    team: characterDef.id,
    equipment: [],
  };
}

export const warlordsOfFireGameCreation: GameCreation = {
  createStarterPlayer
};
