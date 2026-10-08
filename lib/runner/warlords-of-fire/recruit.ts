import { ProcessRunner } from "../types";
import { generateMonster } from "@/lib/games/monster-pack";
import { WarlordInstruction } from "./warlords-types";
import { getMonsterCost, getWarlordAvailableMonsters } from './recruit-helper';
import { monsters } from "@/lib/games/monsters";
import { getEnemies } from "../game-friends-or-enemies";

export const recruitProcesses: ProcessRunner = {
  initialiseForTurn: async (params) => {
    for(const player of params.gameState.players) {
      const instructions = params.playerInstructions[player.id] as WarlordInstruction | undefined;
      if (!instructions?.recruit?.length) continue;
      if (getEnemies(params, player).some(enemy => enemy.health > 0)) continue;
      const availableMonsters = getWarlordAvailableMonsters(params.gameState, player.id);

      // Process recruitment of monsters at the player's current location
      let availableFunds = true;
      while (availableFunds && instructions.recruit.length > 0) {
        const recruit = instructions.recruit[0];

        if (!availableMonsters.includes(recruit.monster)) {
          // Can't get this one
          instructions.recruit.splice(0, 1);
        } else {
          const cost = getMonsterCost(recruit.monster);
          if (cost <= player.coins) {
            // Recruit this one
            params.monsters.push(
              generateMonster(params.gameState, {
                type: recruit.monster,
                location: player.location.id,
                health: monsters[recruit.monster].baseStats.health,
                team: player.team,
              })
            );

            player.coins -= cost;
            instructions.recruit.splice(0, 1);
          } else {
            availableFunds = false;
          }
        }
      }
    }
  }
}
