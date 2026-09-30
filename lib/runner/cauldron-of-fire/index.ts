import { GameRunnerDefinition } from '../types';
import { cauldronOfFireGameCreation } from './game-creation';
import { getMonsters } from './monsters';
import { cauldronOfFireProcesses } from './processes';

export const cauldronOfFireRunner: GameRunnerDefinition = {
  gameCreation: cauldronOfFireGameCreation,
  getMonsters,
  processes: cauldronOfFireProcesses,
};
