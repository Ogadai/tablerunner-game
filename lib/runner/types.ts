import { BaseParams } from "./base-params";

export interface ProcessRunner {
  setup?(params: BaseParams): Promise<void>;
  initialiseForTurn?(params: BaseParams): Promise<void>;
  executeForTurn?(params: BaseParams): Promise<void>;
  executeBetweenTurns?(params: BaseParams): Promise<void>;
}

export interface StarterPlayer {
  location: number;
  level: number;
  availableStats: number;
  coins: number;
  team: string;
};

export interface GameCreation {
  createStarterPlayer: () => StarterPlayer;
}
