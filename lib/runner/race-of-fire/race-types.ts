import { StorePlayerInstructions } from "@/lib/store/types";

export interface RaceInstructionTeam extends StorePlayerInstructions {
  team?: 'blue' | 'red';
}
