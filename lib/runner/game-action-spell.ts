import { SpellIds, spells } from "../games/spells";
import { PlayerActionCast, PlayerState } from "../store/types";
import { BaseParams } from "./base-params";
import { genericAttackMonster } from "./game-action-attack";

export function actionCastSpell(params: BaseParams, player: PlayerState, action: PlayerActionCast): void {
  if (!player.spells.includes(action.spellId as SpellIds)) {
    // Doesn't have this spell
    return;
  }

  const spell = spells[action.spellId];
  const monsters = params.monsters.filter(m => 
    spell.pickTarget ? m.id === action.targetId : m.location === player.location.id
  );

  for(const monster of monsters) {
    genericAttackMonster(params, player, {
      name: spell.name,
      attack: player.baseStats!.magic,
      damage: spell.bonusStats.damage || 0,
    }, monster);
  }
}
