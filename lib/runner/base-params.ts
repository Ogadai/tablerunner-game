import { GameState, PlayerMessagesState, MonsterState, ItemLocationState, LocationCoinState, AllLocationsState } from "../store/types";

export interface BaseParams extends AllLocationsState {
  boardId: string;
  mapId: string;
  gameState: GameState;
  messages: Record<string, PlayerMessagesState>;
}
