import { GameState } from "@/lib/store/types";

interface WinnerDef {
  winner?: boolean;
  blueTeam?: string[];
  redTeam?: string[];
}

// Keep the existing state key so games already in progress retain their winner.
const OWNER = 'crystal-shard';

export const getState = (gameState: GameState) =>
  ({ ...(gameState.processState[OWNER] || { winner: false }) as WinnerDef });

export const saveState = (gameState: GameState, state: WinnerDef) => {
  gameState.processState[OWNER] = state;
}
