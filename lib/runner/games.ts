import { GameRunnerDefinition } from './types';
import { cauldronOfFireRunner } from './cauldron-of-fire';
import { raceOfFireRunner } from './race-of-fire';

export const gameRunners: { [id: string]: GameRunnerDefinition } = {
  cauldronfire: cauldronOfFireRunner,
  racefire: raceOfFireRunner,
};
