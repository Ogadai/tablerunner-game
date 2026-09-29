import { GameCreation } from './types';
import { cauldronOfFireGameCreation } from './cauldron-of-fire/game-creation';

export const gameCreation: { [id: string]: GameCreation } = {
  cauldronfire: cauldronOfFireGameCreation,
};
