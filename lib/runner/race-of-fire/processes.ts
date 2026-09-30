import { BaseParams } from '../base-params';
import { ProcessRunner } from '../types';
import { shardProcess } from './shards';
import { zombies } from '../shared-processes/zombies';
import { dragons } from '../shared-processes/dragons';
import { npcs } from '../shared-processes/npcs';

const allProcesses = [shardProcess, zombies, dragons, npcs];

export const raceOfFireProcesses: ProcessRunner = {
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
