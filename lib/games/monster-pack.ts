import { GameState, MonsterState } from '../store/types';
import { getMonsterStrength, monsters, mostersExcludeFromAutoPopulate } from './monsters';
import { GRID_CELLS, MAP_COLUMNS, MAP_ROWS } from '../games/gridCells';

const availableMonsterIds = Object.keys(monsters)
  .filter(m => !mostersExcludeFromAutoPopulate.includes(m));

export function getAvailableMonstersByStrength(): { id: string, strength: number }[] { 
  return availableMonsterIds.map(id => {
    const def = monsters[id];
    return { id, strength: getMonsterStrength(def) };
  }).sort((a, b) => a.strength - b.strength);
}

export const getCellCoordinates = (cell: number) => {
  const index = GRID_CELLS.indexOf(cell);

  if (index === -1) {
    return { row: -1, col: -1 };
  }

  return {
    row: MAP_ROWS - Math.floor(index / MAP_COLUMNS),
    col: index % MAP_COLUMNS,
  };
};

export const getCellAtCoordinates = (coords: { col: number, row: number }): number => {
  const index = (MAP_ROWS - coords.row) * MAP_COLUMNS + coords.col;
  if (index >= 0 && index < GRID_CELLS.length) {
    return GRID_CELLS[index];
  }
  return 0;
}

export function generateMonster(gameState: GameState, monsterDef: Omit<MonsterState, 'id'>): MonsterState {
  return {
    ...monsterDef,
    id: `m-${++gameState.counters.monsterId}`
  };
}