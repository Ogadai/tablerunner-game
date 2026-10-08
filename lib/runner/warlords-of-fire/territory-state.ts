import { GameState } from "@/lib/store/types";

interface TeamStateDef {
  territory: number[];
  colour: string;
  coins: number;
  monsters: string[];
}

interface TerritoryStateDef {
  teams: Record<string, TeamStateDef>;
}

const OWNER = 'war-territory';

export const DEFAULT_TEAM_STATE: TeamStateDef = {
  territory: [],
  colour: '',
  coins: 0,
  monsters: [],
};

const DEFAULT_STATE: TerritoryStateDef = {
  teams: {},
};

export const getState = (gameState: GameState) =>
  ({ ...(gameState.processState[OWNER] || DEFAULT_STATE) as TerritoryStateDef });

export const saveState = (gameState: GameState, state: TerritoryStateDef) => {
  gameState.processState[OWNER] = state;
}
