import { GameState, PlayerMessagesState, MonsterState, ItemLocationState } from "../store/types";

export interface BaseParams {
  boardId: string;
  mapId: string;
  gameState: GameState;
  messages: Record<string, PlayerMessagesState>;
  monsters: MonsterState[];
  items: ItemLocationState[];
}
