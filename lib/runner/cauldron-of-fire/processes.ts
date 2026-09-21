import { BaseParams } from "../base-params";
import { ProcessRunner } from "../types";

import { keyProcess } from './key-processes';
import { specialMonsters } from './special-monsters';
import { zombies } from './zombies';
import { npcs } from './npcs';
import { invasions } from './invasions';
import { dragons } from './dragons';

const allProcesses = [keyProcess, specialMonsters, zombies, npcs, invasions, dragons];

export const cauldronOfFireProcesses: ProcessRunner = {
  async setup(params: BaseParams): Promise<void> {
    for(const process of allProcesses) {
      if (process.setup) {
        try {
          await process.setup(params);
        } catch (error) {
          console.error('Error starting process', error);
        }
      }
    }
  },

  async executeForTurn(params: BaseParams): Promise<void> {
    for(const process of allProcesses) {
      if (process.executeForTurn) {
        try {
          await process.executeForTurn(params);
        } catch (error) {
          console.error('Error executing process turn', error);
        }
      }
    }
  }
};
