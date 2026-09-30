import { GameCreation, StarterPlayer } from '../types';

// TODO: Define Race of Fire starting values.
const INITIAL_AVAILABLE_STATS = 12;
const INITIAL_COINS = 200;
const START_LOCATION = 10;

export function createStarterPlayer(): StarterPlayer {
  return {
    location: START_LOCATION,
    level: 1,
    availableStats: INITIAL_AVAILABLE_STATS,
    coins: INITIAL_COINS,
    team: 'good',
    equipment: [],
  };
}

export const raceOfFireGameCreation: GameCreation = {
  createStarterPlayer
};
