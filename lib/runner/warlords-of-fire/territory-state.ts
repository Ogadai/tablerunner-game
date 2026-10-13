import { GameState } from "@/lib/store/types";

export type NpcDecision =
  | { type: 'reinforce'; location: number; recruits: string[] }
  | { type: 'expand'; from: number; location: number }
  | { type: 'retreat'; location: number };

export interface TeamStateDef {
  territory: number[];
  colour: string;
  coins: number;
  monsters: string[];
  npcDecision?: NpcDecision;
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

export const getState = (gameState: GameState): TerritoryStateDef => {
  const state = (gameState.processState[OWNER] || DEFAULT_STATE) as TerritoryStateDef;
  return { ...state, teams: { ...state.teams } };
};

export const saveState = (gameState: GameState, state: TerritoryStateDef) => {
  gameState.processState[OWNER] = state;
}
