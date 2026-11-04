import { GameState, PlayerMessagesState, AllLocationsState, StorePlayerInstructions } from "../store/types";
import type { CombatLocationLog } from "./combat-log";

export interface BaseParams extends AllLocationsState {
  boardId: string;
  mapId: string;
  gameState: GameState;
  messages: Record<string, PlayerMessagesState>;
  playerInstructions: Record<string, StorePlayerInstructions>;
  combatLogs?: Record<number, CombatLocationLog>;
  playerCombatLocations?: Record<string, number>;
}
