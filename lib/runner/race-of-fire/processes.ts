import { ProcessRunner } from '../types';

export const raceOfFireProcesses: ProcessRunner = {
  async setup(): Promise<void> {
    // TODO: Set up Race of Fire.
  },

  async initialiseForTurn(): Promise<void> {
    // TODO: Initialise Race of Fire turn state.
  },

  async executeForTurn(): Promise<void> {
    // TODO: Execute Race of Fire turn logic.
  },

  async executeBetweenTurns(): Promise<void> {
    // TODO: Execute Race of Fire between-turn logic.
  }
};
