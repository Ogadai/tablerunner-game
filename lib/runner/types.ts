import { BaseParams } from "./base-params";
import { GameState, MonsterState } from "../store/types";
import { CharacterListEntry, ItemDef } from "../games/types";

export interface GameRunnerDefinition {
  gameCreation: GameCreation;
  getMonsters(gameState: GameState, playerCount?: number): Promise<MonsterState[]>;
  processes: ProcessRunner;
}

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
  equipment: ItemDef[];
};

export interface GameCreation {
  createStarterPlayer: (characterDef: CharacterListEntry, gameState: GameState) => StarterPlayer;
}
