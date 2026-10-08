import { GameState } from "@/lib/store/types";

interface TerritoryStateDef {
  teamTerritory: Record<string, number[]>;
  teamColours: Record<string, string>;
  teamCoins: Record<string, number>;
}

const OWNER = 'war-territory';

const DEFAULT_STATE: TerritoryStateDef = {
  teamTerritory: {},
  teamColours: {},
  teamCoins: {},
};

export const getState = (gameState: GameState) =>
  ({ ...(gameState.processState[OWNER] || DEFAULT_STATE) as TerritoryStateDef });

export const saveState = (gameState: GameState, state: TerritoryStateDef) => {
  gameState.processState[OWNER] = state;
}
