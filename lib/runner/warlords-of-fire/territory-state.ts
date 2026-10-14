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
  /** Pending faction transfer, applied by territory processing this turn. */
  conqueredBy?: string;
}

export interface TerritoryStateDef {
  teams: Record<string, TeamStateDef>;
  winner?: string;
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

/** Resolve simultaneous conquests before moving any faction's assets. */
export function getTeamOwner(state: TerritoryStateDef, team: string): string {
  const visited: string[] = [];
  while (state.teams[team]?.conqueredBy) {
    const cycleStart = visited.indexOf(team);
    // Simultaneous mutual conquests must agree on one owner for every asset.
    if (cycleStart >= 0) return visited.slice(cycleStart).sort()[0];
    visited.push(team);
    team = state.teams[team].conqueredBy!;
  }
  return team;
}
