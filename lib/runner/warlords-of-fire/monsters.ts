import { GameState, MonsterState } from '../../store/types';
import { generateMonsters } from '../monster-generation';

const SAFE_LOCATIONS: number[] = [10, 231, 121, 100];

export async function getMonsters(gameState: GameState, playerCount: number = 1): Promise<MonsterState[]> {
  return await generateMonsters(gameState, playerCount, SAFE_LOCATIONS, SAFE_LOCATIONS);
}

export const playerMonsters: string[] = [
  'rat',
  'spider',
  'snake',
  'goblin',
];
