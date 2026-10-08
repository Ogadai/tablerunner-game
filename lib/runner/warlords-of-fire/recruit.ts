import { getPlayersInstructionsFromRedis } from "@/lib/store/redis-access";
import { ProcessRunner } from "../types";
import { getState, saveState } from "./territory-state";
import { WarlordInstruction } from "./warlords-types";

export const recruitProcesses: ProcessRunner = {
  initialiseForTurn: async (params) => {

    const playerIDs = params.gameState.players.map(player => player.id);
    const playerInstructions = await getPlayersInstructionsFromRedis(params.boardId, params.mapId, playerIDs);

    for(const player of params.gameState.players) {
      const instructions = playerInstructions[player.id] as WarlordInstruction;

      // Process recruitment of monsters at the player's current location
      
    }
  }
}
