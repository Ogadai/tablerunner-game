import { BaseParams } from "./base-params";
import { gameRunners } from './games';

export async function setupProcesses(params: BaseParams) {
  const processes = gameRunners[params.gameState.gameId]?.processes;
  if (processes && processes.setup) {
    await processes.setup(params);
  }
}

export async function initialiseProcessesForTurn(params: BaseParams) {
  const processes = gameRunners[params.gameState.gameId]?.processes;
  if (processes && processes.initialiseForTurn) {
    await processes.initialiseForTurn(params);
  }
}

export async function executeProcessesForTurn(params: BaseParams) {
  const processes = gameRunners[params.gameState.gameId]?.processes;
  if (processes && processes.executeForTurn) {
    await processes.executeForTurn(params);
  }
}

export async function executeProcessesBetweenTurns(params: BaseParams) {
  const processes = gameRunners[params.gameState.gameId]?.processes;
  if (processes && processes.executeBetweenTurns) {
    await processes.executeBetweenTurns(params);
  }
}
