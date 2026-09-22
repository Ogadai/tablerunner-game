import { BaseParams } from "../base-params";
import { ProcessRunner } from "../types";

import { keyProcess } from './key-processes';
import { lichKing } from './lich-king';
import { zombies } from './zombies';
import { npcs } from './npcs';
import { invasions } from './invasions';
import { dragons } from './dragons';
import { GameState } from "@/lib/store/types";

const allProcesses = [keyProcess, lichKing, zombies, npcs, invasions, dragons];

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

  async initialiseForTurn(params: BaseParams): Promise<void> {
    for(const process of allProcesses) {
      if (process.initialiseForTurn) {
        try {
          await process.initialiseForTurn(params);
        } catch (error) {
          console.error('Error initialising for turn', error);
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
  },

  async executeBetweenTurns(params: BaseParams): Promise<void> {
    for(const process of allProcesses) {
      if (process.executeBetweenTurns) {
        try {
          await process.executeBetweenTurns(params);
        } catch (error) {
          console.error('Error executing process turn', error);
        }
      }
    }
  }
};
