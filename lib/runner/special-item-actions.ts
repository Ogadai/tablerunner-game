import { ConsumableIds, keyItems } from "../games/items";
import { PlayerState } from "../store/types";
import { BaseParams } from "./base-params";
import { playerMessageAtLocation, soloMessageAtLocation } from "./game-messages";

export const specialItemActions: Record<string, (params: BaseParams, player: PlayerState) => boolean> = {
  [ConsumableIds.resurrectionStone]: (params: BaseParams, player: PlayerState) =>
    useResurrectionStone(params, player, false),
  [ConsumableIds.resurrectionShard]: (params: BaseParams, player: PlayerState) => 
    useResurrectionStone(params, player, true),
};

for(const keyItemType of Object.keys(keyItems)) {
  specialItemActions[keyItemType] = (params: BaseParams, player: PlayerState) => useKey(params, player, keyItemType);
}

function useResurrectionStone(params: BaseParams, player: PlayerState, alwaysZombies: boolean): boolean {
  // Find dead players at location
  const deadPlayers = params.gameState.players.filter(p => p.health === 0);
  if (deadPlayers.length == 0) {
    playerMessageAtLocation(params, player.id, `**{player}** could not resurrection anyone`);
    return false;
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
      makePlayerZombie(deadPlayer);
    } else {
      playerMessageAtLocation(params, deadPlayer.id, `**{player}** has been **resurrected**!`);
    }
  }
  return true;
}

function useKey(params: BaseParams, player: PlayerState, keyItemType: string): boolean {
    const itemDef = keyItems[keyItemType];
  for(const move of player.location.move) {
    if (!!move.blockDescription && move.keyItemType === keyItemType) {
      delete move.blockDescription;
      delete move.keyItemType;

      params.blockedMoves = params.blockedMoves.filter(b => b.location !== player.location.id || b.direction !== move.direction);

      const lcFirst = (s: string | undefined): string => 
          (s && s.length > 0) ? `${s[0].toLowerCase()}${s.slice(1)}` : '';

      playerMessageAtLocation(params, player.id, `**{player}** used the ${itemDef.name} to **${lcFirst(itemDef.bonusStats?.special)}**!`);

      return true;
    }
  }

  soloMessageAtLocation(params, player.id, `The ${itemDef.name} cannot be used here!`);
  return false;
}

export function makePlayerZombie(player: PlayerState) {
  player.name = `Zombie ${player.name.split(' ')[0]}`;
  player.zombie = true;
}
