import { generateMonster } from "@/lib/games/monster-pack";
import { monsters } from '@/lib/games/monsters';
import { BaseParams } from "../base-params";
import { broadcastMessage } from "../game-messages";
import { ProcessRunner } from "../types";
import { MonsterState } from "@/lib/store/types";
import { games } from "@/lib/games/games";

const OWNER = 'invasions';
const MOVE_CHANCE = 0.5;
const INVASION_LED_RGB = '9E8209';

interface InvasionDef {
  key: string;
  startTurn: number;
  endTurn: number;
  monsterType: string,
  maxCount: number;
  maxPerLocation: number;
  startLocations: number[];
  locations: number[];
  monsterIDs: string[];
}

const routes: { [name: string]: { startLocations: number[], locations: number[] } } = {
  early1: {
    startLocations: [4, 7],
    locations: [38, 4, 5, 6, 7, 34, 45, 46, 47, 48, 33, 8, 9, 32, 49, 77, 31, 10],
  },
  early2: {
    startLocations: [16, 17],
    locations: [13, 14, 15, 16, 17, 28, 27, 26, 25, 54, 55, 56, 24, 23, 18, 19, 20, 21],
  },
  mid1: {
    startLocations: [100, 61, 60],
    locations: [100, 61, 60, 59, 62, 63, 64, 56, 55, 67, 666, 65, 95, 96, 97, 98, 99, 102, 103, 104, 105],
  },
  mid2: {
    startLocations: [113, 111],
    locations: [111, 112, 113, 88, 89, 72, 71, 70, 48, 49, 50, 51, 69, 90, 114, 115, 125, 126, 127, 128, 129, 130, 131, 154, 153],
  },
  late1: {
    startLocations: [231, 229],
    locations: [229, 230, 231, 211, 210, 191, 190, 189, 169, 170, 171, 172, 173, 188, 187, 186, 185, 176, 175, 174, 173, 172, 151, 150, 149, 148, 147, 146],
  },
  late2: {
    startLocations: [180, 181],
    locations: [180, 181, 179, 178, 182, 183, 177, 186, 185, 184, 175, 176, 177, 146, 145, 144, 135, 147, 148, 174, 187],
  },
};

const getState = (params: BaseParams) => 
  (params.gameState.processState[OWNER] || []) as InvasionDef[];

const saveState = (params: BaseParams, invasions: InvasionDef[]) => {
  params.gameState.processState[OWNER] = invasions;
}

export const invasions: ProcessRunner = {
  async setup(params: BaseParams): Promise<void> {
    const invasions: InvasionDef[] = [
      randomInvasion(15, ['rat', 'spider', 'snake'], 'early1', 20),
      randomInvasion(20, ['rat', 'spider', 'snake'], 'early2', 20),
      randomInvasion(30, ['goblin', 'wyvern'], 'early1', 30),
      randomInvasion(40, ['goblin', 'wyvern', 'snake'], 'early2', 30),
      randomInvasion(45, ['scorpion', 'wildcat'], 'early1', 30),
      randomInvasion(50, ['scorpion', 'wildcat'], 'early2', 30),
      randomInvasion(55, ['orc', 'scorpion', 'wildcat'], 'mid1', 30),
      randomInvasion(60, ['orc', 'scorpion', 'wildcat'], 'mid2', 30),
      randomInvasion(65, ['wildcat', 'bandit'], 'late1', 30),
      randomInvasion(70, ['wildcat', 'bandit'], 'late2', 30),
      randomInvasion(75, ['ogre', 'cyclops'], 'late1', 15),
      randomInvasion(80, ['ogre', 'cyclops'], 'late2', 15),
    ];

    const randomCount = randomNumber(3, 5);
    while(invasions.length > randomCount) {
      invasions.splice(Math.floor(Math.random() * invasions.length), 1);
    }

    saveState(params, invasions);
  },

  async executeForTurn(params: BaseParams) {
    const invasions = getState(params);
    for(const invasion of invasions) {
      if (params.gameState.turn === invasion.startTurn) {
        startInvasion(params, invasion);
      } else if (params.gameState.turn > invasion.startTurn
          && params.gameState.turn <= invasion.endTurn && invasion.monsterIDs.length > 0) {
        processInvasion(params, invasion);
      }
    }
    saveState(params, invasions);
    updateLeds(params, invasions)
  }
}

const startInvasion = (params: BaseParams, invasion: InvasionDef) => {
  // Create some initial monsters
  createStartMonsters(params, invasion, []);

  broadcastMessage(params, `A **${monsters[invasion.monsterType].name}** invasion has started!`);
}

const processInvasion = (params: BaseParams, invasion: InvasionDef) => {
  const existingMonsters = params.monsters.filter(m =>
    invasion.monsterIDs.includes(m.id)
  );

  // See if they want to move
  for(const monster of existingMonsters) {
    if ((monster.health > 0) && (Math.random() > MOVE_CHANCE) &&
      (params.gameState.players.filter(p => p.location.id === monster.location).length === 0)) {
      
      // Get the move options
      const moveOptions = getPossibleMoveLocations(params, monster.location)
          .filter(m => invasion.locations.includes(m));
      
      const moveLocation = moveOptions[randomNumber(0, moveOptions.length)];
      if (params.gameState.players.filter(p => p.location.id === moveLocation).length === 0) {
        if (existingMonsters.filter(m => m.location === moveLocation)
          < existingMonsters.filter(m => m.location === monster.location)) {
          // move this monster
          monster.location = moveLocation;
        }
      }
    }
  }

  // May be room for more start monsters
  createStartMonsters(params, invasion, existingMonsters);
}

const updateLeds = (params: BaseParams, invasions: InvasionDef[]) => {
  const ledLocations = invasions.reduce((locationSet, invasion) => {
    getInvasionLocations(params, invasion).forEach(l => locationSet.add(l));
    return locationSet;
  }, new Set<number>());

  params.gameState.leds = [
    ...params.gameState.leds.filter(l => l.owner !== OWNER),
    ...[...ledLocations].map(l => ({
      location: l,
      rgb: INVASION_LED_RGB,
      owner: OWNER,
    }))
  ]
}

const createStartMonsters = (params: BaseParams, invasion: InvasionDef, existingMonsters: MonsterState[]) => {
  for(const startLocation of invasion.startLocations) {
    const existing = existingMonsters.filter(m => m.location === startLocation);

    for(let n = existing.length; n < invasion.maxPerLocation; n++) {
      const newMonster = generateMonster(params.gameState, {
        type: invasion.monsterType,
        location: startLocation,
        health: monsters[invasion.monsterType].baseStats.health,
      });

      params.monsters.push(newMonster);
      invasion.monsterIDs.push(newMonster.id);
    }
  }
}

const randomInvasion = (turn: number, types: string[], route: string, size: number): InvasionDef => {
  const startTurn = randomNumber(turn - 10, turn + 10);
  return {
    key: `invasion:${turn}-${route}`,
    startTurn: startTurn,
    endTurn: startTurn + Math.floor(size / 2),
    monsterType: types[randomNumber(0, types.length)],
    maxCount: randomNumber(size - 5, size + 5),
    maxPerLocation: 1 + Math.floor(size / 10),
    startLocations: routes[route].startLocations,
    locations: routes[route].locations,
    monsterIDs: [],
  };
}

const getInvasionLocations = (params: BaseParams, invasion: InvasionDef): number[] => {
  const existingMonsters = params.monsters.filter(m =>
    invasion.monsterIDs.includes(m.id) && m.health > 0
  );
  return existingMonsters.map(m => m.location);
}

const getPossibleMoveLocations = (params: BaseParams, fromLocation: number): number[] => {
  const getGameDef = games.find(g => g.id === params.gameState.gameId)!;
  const locationDef = getGameDef?.locations.find(l => l.id === fromLocation)!;

  const moveLocations = locationDef.move
    .filter(mv => !params.blockedMoves.find(block => block.location === fromLocation && block.direction === mv.direction))
    .map(mv => mv.id);

  return moveLocations;
}

const randomNumber = (from: number, to: number): number =>
    from + Math.floor(Math.random() * (to - from));
