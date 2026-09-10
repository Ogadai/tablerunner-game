import { BaseParams } from "../base-params";
import { ProcessRunner } from "../types";

import { keyProcess } from './key-processes';
import { specialMonsters } from './special-monsters';
import { zombies } from './zombies';

const allProcesses = [keyProcess, specialMonsters, zombies];

export const cauldronOfFireProcesses: ProcessRunner = {
  async setup(params: BaseParams): Promise<void> {
    for(const process of allProcesses) {
      if (process.setup) {
        await process.setup(params);
      }
    }
  },

  async executeForTurn(params: BaseParams): Promise<void> {
    for(const process of allProcesses) {
      if (process.executeForTurn) {
        await process.executeForTurn(params);
      }
    }
  }
};
