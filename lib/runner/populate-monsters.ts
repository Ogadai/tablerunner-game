'use server'

import { GameState, MonsterState } from "../store/types";
import { gameRunners } from './games';

export async function populateMonsters(gameState: GameState, playerCount: number = 1): Promise<MonsterState[]> {
  return await gameRunners[gameState.gameId].getMonsters(gameState, playerCount);
}
