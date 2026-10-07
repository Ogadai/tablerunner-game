import { GameState, MonsterState } from '../store/types';
import { getMonsterStrength, monsters, mostersExcludeFromAutoPopulate } from './monsters';

const availableMonsterIds = Object.keys(monsters)
  .filter(m => !mostersExcludeFromAutoPopulate.includes(m));

export function getAvailableMonstersByStrength(): { id: string, strength: number }[] { 
  return availableMonsterIds.map(id => {
    const def = monsters[id];
    return { id, strength: getMonsterStrength(def) };
  }).sort((a, b) => a.strength - b.strength);
}

export function generateMonster(gameState: GameState, monsterDef: Omit<MonsterState, 'id'>): MonsterState {
  return {
    ...monsterDef,
    id: `m-${++gameState.counters.monsterId}`
  };
}
