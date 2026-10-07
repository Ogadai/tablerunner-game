import { GameState, MonsterState } from '../../store/types';
import { generateMonsters } from '../monster-generation';

const SAFE_LOCATIONS: number[] = [10, 23, 38, 78, 92, 102, 119, 155, 184, 211, 224];

export async function getMonsters(gameState: GameState, playerCount: number = 1): Promise<MonsterState[]> {
  return await generateMonsters(gameState, playerCount, SAFE_LOCATIONS);
}
