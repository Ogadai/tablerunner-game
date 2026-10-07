import { GameRunnerDefinition } from '../types';
import { warlordsOfFireGameCreation } from './game-creation';
import { getMonsters } from './monsters';
import { warlordsOfFireProcesses } from './processes';

export const warlordsOfFireRunner: GameRunnerDefinition = {
  gameCreation: warlordsOfFireGameCreation,
  getMonsters,
  processes: warlordsOfFireProcesses,
};
