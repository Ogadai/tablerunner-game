import { CharacterListEntry, ItemDef } from '@/lib/games/types';
import { GameState } from '@/lib/store/types';
import { GameCreation, StarterPlayer } from '../types';
import { calculateMidGameJoinCatchUp } from '../mid-game-join';

// Define Race of Fire starting values.
const INITIAL_AVAILABLE_STATS = 12;
const INITIAL_COINS = 200;
const START_LOCATION = 10;

export function createStarterPlayer(characterDef?: CharacterListEntry, gameState?: GameState): StarterPlayer {
  const equipment: ItemDef[] = [];
  const catchUp = calculateMidGameJoinCatchUp(
    gameState,
    INITIAL_AVAILABLE_STATS,
    [...(characterDef?.equipment ?? []), ...equipment],
  );

  return {
    location: START_LOCATION,
    level: catchUp?.level ?? 1,
    ...(catchUp ? { points: catchUp.points } : {}),
    availableStats: catchUp?.availableStats ?? INITIAL_AVAILABLE_STATS,
    coins: catchUp?.coins ?? INITIAL_COINS,
    team: 'good',
    equipment,
  };
}

export const raceOfFireGameCreation: GameCreation = {
  createStarterPlayer
};
