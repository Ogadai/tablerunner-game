import { generateMonster } from "@/lib/games/monster-pack";
import { BaseParams } from "../base-params";
import { broadcastMessage } from "../game-messages";
import { ProcessRunner } from "../types";
import { monsters } from '../../games/monsters';
import { games } from "@/lib/games/games";
import { deleteStoreStateFromRedis } from "@/lib/store/redis-access";

const ZOMBIE_REPRODUCE_CHANCE = 0.3;
const ZOMBIE_TRAVEL_CHANCE = 0.25;
const ZOMBIE_LED_OWNER = 'zombies';
const ZOMBIE_LED_RGB = '9ACD32';
const MAX_ZOMBIES_AT_SHOP = 4;

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
          target.zombie = true;
        }
      }
    }

    const beforeLocations = getZombieLocations(params);
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

        // Destroy any shops and create extra zombies
        if (params.gameState.stores.includes(zombie.location)) {
          params.gameState.stores = params.gameState.stores.filter(s => s !== zombie.location);
          await deleteStoreStateFromRedis(params.boardId, params.mapId, zombie.location);

          const newZombies = Math.ceil(Math.random() * MAX_ZOMBIES_AT_SHOP);
          for(let n = 0; n < newZombies; n++) {
            generateMonster(params.gameState, {
              location: zombie.location,
              type: 'zombie',
              zombie: true,
              health: monsters['zombie'].baseStats.health
            });
          }
        }
      }
    }

    const afterLocations = getZombieLocations(params);
    const ledLocations = (afterLocations.size > 1) ? Array.from(afterLocations) : [];

    params.gameState.leds = [
      ...params.gameState.leds.filter(l => l.owner !== ZOMBIE_LED_OWNER),
      ...ledLocations.map(l => ({
        location: l,
        rgb: ZOMBIE_LED_RGB,
        owner: ZOMBIE_LED_OWNER,
      }))
    ]

    if (afterLocations.size > beforeLocations.size) {
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

function getZombieLocations(params: BaseParams): Set<number> {
  return params.monsters
    .filter(m => m.zombie && m.health > 0)
    .reduce((locationSet, zombie) => {
      locationSet.add(zombie.location);
      return locationSet;
    }, new Set<number>());
}