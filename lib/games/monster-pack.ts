import { AllMonsterState } from '../store/types';
import { monsters as monsters1 } from './monster-packs/pack1';
import { monsters as monsters2 } from './monster-packs/pack2';
import { monsters as monsters3 } from './monster-packs/pack3';
import { GRID_CELL_COUNT } from '../games/gridCells';

const monsterLists = [
  monsters1, monsters2, monsters3
];

export function getMonsters() {
  const allMonsters: AllMonsterState = {
    monsters: []
  };

  let monsterId = 1;

  for(let n = 1; n <= GRID_CELL_COUNT; n++) {
    const listIndex = Math.floor(Math.random() * monsterLists.length);
    const monstersAtLocation = monsterLists[listIndex].monsters.filter(m => m.location === n);
    allMonsters.monsters.push(
      ...monstersAtLocation.map(m => ({...m, id: `m-${monsterId++}`}))
    );
  }

  return allMonsters;
};
