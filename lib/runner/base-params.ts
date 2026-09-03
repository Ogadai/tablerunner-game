import { GameState, PlayerMessagesState, MonsterState } from "../store/types";

export interface BaseParams {
  boardId: string;
  mapId: string;
  gameState: GameState;
  messages: Record<string, PlayerMessagesState>;
  monsters: MonsterState[];
}
