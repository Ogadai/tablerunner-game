import { BaseParams } from "./base-params";
import { ProcessRunner } from './types';
import { cauldronOfFireProcesses } from './cauldron-of-fire/processes';

const gameProcesses: { [id: string]: ProcessRunner } = {
  cauldronfire: cauldronOfFireProcesses,
};

export async function setupProcesses(params: BaseParams) {
  const processes = gameProcesses[params.gameState.gameId];
  if (processes && processes.setup) {
    await processes.setup(params);
  }
}

export async function executeProcessesForTurn(params: BaseParams) {
  const processes = gameProcesses[params.gameState.gameId];
  if (processes && processes.executeForTurn) {
    await processes.executeForTurn(params);
  }
}
