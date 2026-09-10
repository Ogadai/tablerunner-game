import { generateMonster } from "@/lib/games/monster-pack";
import { BaseParams } from "../base-params";
import { broadcastMessage } from "../game-messages";
import { makeNamedTargetZombie } from "../special-item-actions";
import { ProcessRunner } from "../types";
import { monsters } from '../../games/monsters';
import { games } from "@/lib/games/games";

const ZOMBIE_REPRODUCE_CHANCE = 0.3;
const ZOMBIE_TRAVEL_CHANCE = 0.25;

export const zombies: ProcessRunner = {
  async setup(params: BaseParams): Promise<void> {

  },

  async executeForTurn(params: BaseParams) {
    const infectedMonsters = params.monsters.filter(m => !m.zombie && m.health > 0 && m.infected && m.infected > 0);
    for(const monster of infectedMonsters) {
      if (monster.infected) {
        monster.infected--;
        if (monster.infected <= 0) {
          monster.zombie = true;
        }
      }
    }

    const infectedNamedTargets = params.gameState.players.filter(p => !p.zombie && p.health > 0 && p.infected && p.infected > 0);
    for(const target of infectedNamedTargets) {
      if (target.infected) {
        target.infected--;
        if (target.infected <= 0) {
          makeNamedTargetZombie(target);
        }
      }
    }

    const originalLocationCount = countZombieLocations(params);
    const zombieMonsters = params.monsters.filter(m => m.zombie);
    for(const zombie of zombieMonsters) {
      // Get any non-zombies at the same location and make them zombies
      const notZombies = params.monsters.filter(m => !m.zombie && m.health > 0 && m.location === zombie.location);
      for(const notZombie of notZombies) {
        notZombie.zombie = true;
      }

      // TODO: If no players at the location, replace any NPCs at the location with zombies

      if (Math.random() < ZOMBIE_REPRODUCE_CHANCE) {
        // Make a new monster like this one
        generateMonster(params.gameState, {
          ...zombie,
          health: monsters[zombie.type].baseStats.health
        })
      }

      if (Math.random() < ZOMBIE_TRAVEL_CHANCE) {
        const moves = getPossibleMoveLocations(params, zombie.location);
        zombie.location = moves[Math.floor(Math.random() * moves.length)];
      }
    }

    const newLocationCount = countZombieLocations(params);
    if (newLocationCount > originalLocationCount) {
      broadcastMessage(params, 'A zombie infection is spreading');
    }
  },
}

function getPossibleMoveLocations(params: BaseParams, fromLocation: number): number[] {
  const getGameDef = games.find(g => g.id === params.gameState.gameId)!;
  const locationDef = getGameDef?.locations.find(l => l.id === fromLocation)!;

  const moveLocations = locationDef.move
    .filter(mv => !params.blockedMoves.find(block => block.location === fromLocation && block.direction === mv.direction))
    .map(mv => mv.id);

  return moveLocations;
}

function countZombieLocations(params: BaseParams): number {
  const locationSet = params.monsters
    .filter(m => m.zombie && m.health > 0)
    .reduce((locationSet, zombie) => {
      locationSet.add(zombie.location);
      return locationSet;
    }, new Set<number>());

  return locationSet.size;
}