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

// Coordinates are 0-based, with row 0 at the bottom and column 0 at the left.
export const getCellCoordinates = (cell: number) => {
  const index = GRID_CELLS.indexOf(cell);

  if (index === -1) {
    return { row: -1, col: -1 };
  }

  return {
    row: MAP_ROWS - 1 - Math.floor(index / MAP_COLUMNS),
    col: index % MAP_COLUMNS,
  };
};

export const getCellAtCoordinates = (coords: { col: number, row: number }): number => {
  if (!Number.isInteger(coords.row) || !Number.isInteger(coords.col)
      || coords.row < 0 || coords.row >= MAP_ROWS
      || coords.col < 0 || coords.col >= MAP_COLUMNS) {
    return 0;
  }
  const index = (MAP_ROWS - 1 - coords.row) * MAP_COLUMNS + coords.col;
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
