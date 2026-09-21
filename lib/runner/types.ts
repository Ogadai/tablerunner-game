import { GameState } from "../store/types";
import { BaseParams } from "./base-params";

export interface ProcessRunner {
  setup?(params: BaseParams): Promise<void>;
  executeForTurn?(params: BaseParams): Promise<void>;
  executeBetweenTurns?(gameState: GameState): Promise<void>;
}
