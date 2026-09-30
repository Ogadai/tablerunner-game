import { GameState, MonsterState } from '../../store/types';
import { generateMonsters } from '../monster-generation';

export async function getMonsters(gameState: GameState, playerCount: number = 1): Promise<MonsterState[]> {
  return await generateMonsters(gameState, playerCount);
}
