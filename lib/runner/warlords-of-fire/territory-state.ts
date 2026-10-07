import { GameState } from "@/lib/store/types";

interface TerritoryStateDef {
  teamTerritory: Record<string, number[]>;
  teamColours: Record<string, string>;
}

const OWNER = 'war-territory';

export const getState = (gameState: GameState) =>
  ({ ...(gameState.processState[OWNER] || { teamTerritory: {}, teamColours: {} }) as TerritoryStateDef });

export const saveState = (gameState: GameState, state: TerritoryStateDef) => {
  gameState.processState[OWNER] = state;
}
