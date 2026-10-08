import { getPlayersInstructionsFromRedis, setPlayerInstructionsInRedis } from "@/lib/store/redis-access";
import { ProcessRunner } from "../types";
import { generateMonster } from "@/lib/games/monster-pack";
import { WarlordInstruction } from "./warlords-types";
import { getMonsterCost, getWarlordAvailableMonsters } from './recruit-helper';
import { monsters } from "@/lib/games/monsters";

export const recruitProcesses: ProcessRunner = {
  initialiseForTurn: async (params) => {
    const playerIDs = params.gameState.players.map(player => player.id);
    const playerInstructions = await getPlayersInstructionsFromRedis(params.boardId, params.mapId, playerIDs);

    for(const player of params.gameState.players) {
      const instructions = playerInstructions[player.id] as WarlordInstruction;
      const availableMonsters = getWarlordAvailableMonsters(params.gameState, player.id);

      // Process recruitment of monsters at the player's current location
      let availableFunds = true;
      let modifiedInstructions = false;
      while (availableFunds && instructions.recruit.length > 0) {
        const recruit = instructions.recruit[0];

        if (!availableMonsters.includes(recruit.monster)) {
          // Can't get this one
          instructions.recruit.splice(0, 1);
          modifiedInstructions = true;
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
            modifiedInstructions = true;
          } else {
            availableFunds = false;
          }
        }
      }

      if (modifiedInstructions) {
        await setPlayerInstructionsInRedis(params.boardId, params.mapId, player.id, instructions);
      }
    }
  }
}
