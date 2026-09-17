import { ConsumableIds, keyItems } from "../games/items";
import { INamedTarget, PlayerState } from "../store/types";
import { BaseParams } from "./base-params";
import { updateLockLeds } from "./game-action-move";
import { playerMessageAtLocation, soloMessageAtLocation } from "./game-messages";

export const specialItemActions: Record<string, (params: BaseParams, player: INamedTarget) => boolean> = {
  [ConsumableIds.resurrectionStone]: (params: BaseParams, player: INamedTarget) =>
    useResurrectionStone(params, player, false),
  [ConsumableIds.resurrectionShard]: (params: BaseParams, player: INamedTarget) => 
    useResurrectionStone(params, player, true),
};

for(const keyItemType of Object.keys(keyItems)) {
  specialItemActions[keyItemType] = (params: BaseParams, player: INamedTarget) => useKey(params, player, keyItemType);
}

function useResurrectionStone(params: BaseParams, player: INamedTarget, alwaysZombies: boolean): boolean {
  // Find dead players at location
  const deadTargets = [
    ...params.gameState.players.filter(p => 
      p.health === 0 && p.location.id === player.location.id
    ),
    ...params.gameState.npcs.filter(n => 
      n.health === 0 && n.location.id === player.location.id
    ),
  ];

  if (deadTargets.length == 0) {
    playerMessageAtLocation(params, player.id, `**{player}** could not resurrection anyone`);
    return false;
  }

  const zombies = alwaysZombies || deadTargets.length > 1;
  const zombieMsg = alwaysZombies
    ? ', it sparks and crackles!'
    : (zombies ? ', but its power was divided!' : '')

  playerMessageAtLocation(params, player.id,
    `**{player}** used a${alwaysZombies ? ' cracked' : ''} resurrection stone${zombieMsg}`
  );

  for(const deadPlayer of deadTargets) {
    deadPlayer.health = 1;

    if (zombies) {
      playerMessageAtLocation(params, deadPlayer.id, `**{player}** {ownership} **risen from the grave**!`);
      deadPlayer.zombie = true;
    } else {
      deadPlayer.zombie = false;
      playerMessageAtLocation(params, deadPlayer.id, `**{player}** {ownership} been **resurrected**!`);
    }
  }
  return true;
}

function useKey(params: BaseParams, player: INamedTarget, keyItemType: string): boolean {
  const itemDef = keyItems[keyItemType];
  const playersAtLocation = params.gameState.players.filter(p => p.location.id === player.location.id);
  
  let unlocked = false;
  for(const move of player.location.move) {
    if (!!move.blockDescription && move.keyItemType === keyItemType) {
      params.blockedMoves = params.blockedMoves.filter(b => b.location !== player.location.id || b.direction !== move.direction);

      // Unlock for all players at location
      for(const p of playersAtLocation) {
        for(const m of p.location.move) {
          if (m.id === move.id) {
            delete m.blockDescription;
            delete m.keyItemType;
          }
        }
      }

      updateLockLeds(params.gameState, [move.id], false);
      unlocked = true;
    }
  }

  if (unlocked) {
    const lcFirst = (s: string | undefined): string => 
        (s && s.length > 0) ? `${s[0].toLowerCase()}${s.slice(1)}` : '';

    playerMessageAtLocation(params, player.id, `**{player}** used the ${itemDef.name} to **${lcFirst(itemDef.bonusStats?.special)}**!`);
  } else {
    soloMessageAtLocation(params, player.id, `The ${itemDef.name} cannot be used here!`);
  }
  return unlocked;
}
