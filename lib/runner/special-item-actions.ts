import { ConsumableIds } from "../games/items";
import { PlayerState } from "../store/types";
import { BaseParams } from "./base-params";
import { playerMessageAtLocation } from "./game-messages";

export const specialItemActions: Record<string, (params: BaseParams, player: PlayerState) => void> = {
  [ConsumableIds.resurrectionStone]: (params: BaseParams, player: PlayerState) =>
    useResurrectionStone(params, player, false),
  [ConsumableIds.resurrectionShard]: (params: BaseParams, player: PlayerState) => 
    useResurrectionStone(params, player, true),
};

function useResurrectionStone(params: BaseParams, player: PlayerState, alwaysZombies: boolean) {
  // Find dead players at location
  const deadPlayers = params.gameState.players.filter(p => p.health === 0);
  if (deadPlayers.length == 0) {
    playerMessageAtLocation(params, player.id, `**{player}** wasted a resurrection stone`);
    return;
  }

  const zombies = alwaysZombies || deadPlayers.length > 1;
  const zombieMsg = alwaysZombies
    ? ', it sparks and crackles!'
    : (zombies ? ', but its power was divided!' : '')

  playerMessageAtLocation(params, player.id,
    `**{player}** used a${alwaysZombies ? ' cracked' : ''} resurrection stone${zombieMsg}`
  );

  for(const deadPlayer of deadPlayers) {
    deadPlayer.health = 1;

    if (zombies) {
      playerMessageAtLocation(params, deadPlayer.id, `The body of **{player}** has been **reanimated**!`);
      deadPlayer.name = `Zombie ${deadPlayer.name.split(' ')[0]}`;
      deadPlayer.zombie = true;
    } else {
      playerMessageAtLocation(params, deadPlayer.id, `**{player}** has been **resurrected**!`);
    }
  }
}
