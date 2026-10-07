import { CharacterListEntry } from '@/lib/games/types';
import { GameCreation, StarterPlayer } from '../types';
import { PlayerState } from '@/lib/store/types';

// TODO: Define Race of Fire starting values.
const INITIAL_AVAILABLE_STATS = 12;
const INITIAL_COINS = 200;
const START_LOCATION = 10;

export function createStarterPlayer(characterDef: CharacterListEntry, players: PlayerState[]): StarterPlayer {
  return {
    location: START_LOCATION,
    level: 1,
    availableStats: INITIAL_AVAILABLE_STATS,
    coins: INITIAL_COINS,
    team: 'good',
    equipment: [],
  };
}

export const warlordsOfFireGameCreation: GameCreation = {
  createStarterPlayer
};
