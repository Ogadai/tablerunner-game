import { allItems } from "@/lib/games/items";
import { GameCreation, StarterPlayer } from "../types";

const INITIAL_AVAILABLE_STATS = 5;
const INITIAL_COINS = 20;
const START_LOCATION = 10;

export function createStarterPlayer(): StarterPlayer {
  return {
    location: START_LOCATION,
    level: 1,
    availableStats: INITIAL_AVAILABLE_STATS,
    coins: INITIAL_COINS,
    team: 'good',
    equipment: [allItems.resurrectionStore],
  };
}

export const cauldronOfFireGameCreation: GameCreation = {
  createStarterPlayer
};
