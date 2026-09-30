import { GameRunnerDefinition } from './types';
import { cauldronOfFireRunner } from './cauldron-of-fire';

export const gameRunners: { [id: string]: GameRunnerDefinition } = {
  cauldronfire: cauldronOfFireRunner,
};
