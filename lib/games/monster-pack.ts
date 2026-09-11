import { GameState, MonsterState } from '../store/types';
import { getMonsterStrength, monsters, mostersExcludeFromAutoPopulate } from './monsters';
import { GRID_CELLS, GRID_CELL_COUNT, MAP_COLUMNS, MAP_ROWS } from '../games/gridCells';
import { games } from './games';
import { Location } from './types';

const MONSTER_DISTANCE_SCALE = 0.1;
const PLAYER_COUNT_SCALE = 0.25;
const MONSTER_COUNT_SCALE = 2;
const MONSTER_COUNT_MAX = 8;

const availableMonsterIds = Object.keys(monsters)
  .filter(m => !mostersExcludeFromAutoPopulate.includes(m));

const availableMonstersByStrength: { id: string, strength: number }[] = 
  availableMonsterIds.map(id => {
    const def = monsters[id];
    return { id, strength: getMonsterStrength(def) };
  }).sort((a, b) => a.strength - b.strength);

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

const startXY = getCellCoordinates(10);
function getDistanceFromStart(cell: number): number {
  const cellXY = getCellCoordinates(cell);

  const vector = {
    x: cellXY.col - startXY.col,
    y: cellXY.row - startXY.row,
  };

  return 0.5 * Math.abs(vector.x) + 2 * Math.abs(vector.y);
}

export function getMonsters(gameState: GameState, playerCount: number = 1): MonsterState[] {
  const newMonsters: MonsterState[] = [];
  for(let n = 1 ; n <= GRID_CELL_COUNT; n++) {
    newMonsters.push(...getCellMonsters(gameState, n, playerCount));
  }
  return newMonsters;
}

function getCellMonsters(gameState: GameState, cell: number, playerCount: number): MonsterState[] {
  const avgStrength = getCellStrength(gameState, cell, playerCount);
  if (avgStrength < 0.02) {
    return [];
  }

  const strength = {
    min: avgStrength  - 0.3,
    max: avgStrength * 1.3,
  };
  const maxCount = Math.min(Math.floor(1 + avgStrength * MONSTER_COUNT_SCALE), MONSTER_COUNT_MAX);
  const targetCount = Math.ceil(Math.random() * maxCount);

  let cellMonsters: { id: string, strength: number }[] = [];
  let totalStrength = 0;
  let attempts = 0;
  while(attempts < 10 && cellMonsters.length < targetCount) {
    cellMonsters = [];
    totalStrength = 0;
    
    for(let n = 0; n < targetCount; n++) {
      const pick = pickMonster((strength.max - totalStrength) / (targetCount - n));
      if (pick) {
        totalStrength += pick.strength;
        cellMonsters.push(pick);
      }
    }
    attempts++;
  }

  return cellMonsters.map(c => generateMonster(gameState, {
    type: c.id,
    location: cell,
    health: monsters[c.id].baseStats.health,
  }));
}

function pickMonster(maxStrength: number): { id: string, strength: number } | null {
  const available = availableMonstersByStrength.filter(m => m.strength <= maxStrength);
  if (availableMonstersByStrength.length === 0) {
    return null;
  }

  const top4 = available.length > 4 ? available.slice(available.length - 4) : available;
  return top4[Math.floor(Math.random() * top4.length)];
}

function getCellStrength(gameState: GameState, cell: number, playerCount: number): number {
  const locations = games.find(g => g.id === gameState.gameId)!.locations;
  const location = locations.find(l => l.id === cell)!;

  const chance = getMonsterChance(gameState, location);
  if (Math.random() > chance) {
    return 0;
  }

  const playerFactor = 0.5 + playerCount * PLAYER_COUNT_SCALE;
  const typeFactor = location.underground ? 1 : 0.5;
  const distance = getDistanceFromStart(cell);
  return distance * typeFactor * playerFactor * MONSTER_DISTANCE_SCALE;
}

function getMonsterChance(gameState: GameState, location: Location): number {
  const desc = location.description.toLocaleLowerCase();
  
  if (location.underground) {
    if (desc.includes('cavern') || desc.includes('cave') || desc.includes('chamber')) {
      return 0.9;
    } else {
      return 0.7;
    }
  } else {
    if (desc.includes('village') || desc.includes('tavern') || desc.includes('shop')) {
      return 0;
    } else if (desc.includes('crossroad')) {
      return 0.3;
    } else if (desc.includes('road')) {
      return 0.5;
    } else if (desc.includes('path') || desc.includes('track') || desc.includes('trail')) {
      return 0.7;
    }
  }

  return 0.8;
}

export function generateMonster(gameState: GameState, monsterDef: Omit<MonsterState, 'id'>): MonsterState {
  return {
    ...monsterDef,
    id: `m-${++gameState.counters.monsterId}`
  };
}