import { GameState, PlayerMessagesState, AllLocationsState, StorePlayerInstructions } from "../store/types";

export interface BaseParams extends AllLocationsState {
  boardId: string;
  mapId: string;
  gameState: GameState;
  messages: Record<string, PlayerMessagesState>;
  playerInstructions: Record<string, StorePlayerInstructions>;
}
