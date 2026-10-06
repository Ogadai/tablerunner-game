import { StorePlayerInstructions } from "@/lib/store/types";

export type RaceTeam = 'blue' | 'red' | null;

export type RaceTeamSelections = Record<string, RaceTeam>;

export interface RaceInstructionTeam extends StorePlayerInstructions {
  team?: RaceTeam;
}
