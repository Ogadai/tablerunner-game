import { GameRunnerDefinition } from '../types';
import { raceOfFireGameCreation } from './game-creation';
import { getMonsters } from './monsters';
import { raceOfFireProcesses } from './processes';

export const raceOfFireRunner: GameRunnerDefinition = {
  gameCreation: raceOfFireGameCreation,
  getMonsters,
  processes: raceOfFireProcesses,
};
