import { CharacterListEntry } from '@/lib/games/types';
import { GameCreation, StarterPlayer } from '../types';
import { PlayerState } from '@/lib/store/types';

// Define Warlords of Fire starting values.
const INITIAL_AVAILABLE_STATS = 12;
const INITIAL_COINS = 200;
const START_LOCATIONS = [10, 231, 121, 100];

export function createStarterPlayer(characterDef: CharacterListEntry, players: PlayerState[]): StarterPlayer {
  const availableLocations = START_LOCATIONS.filter(loc => !players.some(player => player.startLocation === loc));

  return {
    location: availableLocations[Math.floor(Math.random() * availableLocations.length)] || START_LOCATIONS[0],
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
