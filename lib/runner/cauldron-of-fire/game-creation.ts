import { allItems } from "@/lib/games/items";
import { CharacterListEntry } from "@/lib/games/types";
import { GameState } from "@/lib/store/types";
import { GameCreation, StarterPlayer } from "../types";
import { calculateMidGameJoinCatchUp } from "../mid-game-join";

const INITIAL_AVAILABLE_STATS = 5;
const INITIAL_COINS = 20;
const START_LOCATION = 10;

export function createStarterPlayer(_characterDef?: CharacterListEntry, gameState?: GameState): StarterPlayer {
  const catchUp = calculateMidGameJoinCatchUp(gameState, INITIAL_AVAILABLE_STATS);

  return {
    location: START_LOCATION,
    level: catchUp?.level ?? 1,
    ...(catchUp ? { points: catchUp.points } : {}),
    availableStats: catchUp?.availableStats ?? INITIAL_AVAILABLE_STATS,
    coins: catchUp?.coins ?? INITIAL_COINS,
    team: 'good',
    equipment: [allItems.resurrectionStore],
  };
}

export const cauldronOfFireGameCreation: GameCreation = {
  createStarterPlayer
};
