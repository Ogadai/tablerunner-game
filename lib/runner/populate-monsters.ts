'use server'

import { GameState, MonsterState } from "../store/types";
import { getMonsters as cauldronOfFireMonsters } from '../games/maps/cauldron-of-fire/index';

type MonsterFunction = (gameState: GameState, playerCount: number) => Promise<MonsterState[]>;

const gameMonsters: { [id: string]: MonsterFunction } = {
  cauldronfire: cauldronOfFireMonsters,
};

export async function populateMonsters(gameState: GameState, playerCount: number = 1): Promise<MonsterState[]> {
  return await gameMonsters[gameState.gameId](gameState, playerCount);
}
