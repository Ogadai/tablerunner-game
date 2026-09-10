import { BaseParams } from "./base-params";

export interface ProcessRunner {
  setup?(params: BaseParams): Promise<void>;
  executeForTurn?(params: BaseParams): Promise<void>;
}
