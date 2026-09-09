import { GameState, MonsterState } from '../store/types';
import { monsters as monsters1 } from './monster-packs/pack1';
import { monsters as monsters2 } from './monster-packs/pack2';
import { monsters as monsters3 } from './monster-packs/pack3';
import { GRID_CELL_COUNT } from '../games/gridCells';

const monsterLists = [
  monsters1, monsters2, monsters3
];

export function getMonsters(gameState: GameState): MonsterState[] {
  const monsters: MonsterState[] = [];

  for(let n = 1; n <= GRID_CELL_COUNT; n++) {
    const listIndex = Math.floor(Math.random() * monsterLists.length);
    const monstersAtLocation = monsterLists[listIndex].filter(m => m.location === n);
    monsters.push(
      ...monstersAtLocation.map(m => ({...m, id: `m-${++gameState.counters.monsterId}`}))
    );
  }

  return monsters;
};
