import { scrollItems } from "../games/items";
import { SpellIds, spells } from "../games/spells";
import { PlayerActionCast, PlayerActionReadScroll, PlayerState } from "../store/types";
import { BaseParams } from "./base-params";
import { genericAttackMonster } from "./game-action-attack";

const MAX_RECENT_SPELLS = 3;

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

  const recentSpells: SpellIds[] = [
    action.spellId as SpellIds,
    ...(player.recentSpells || []).filter(id => id !== action.spellId)
  ];

  player.magic = Math.max(0, player.magic - spell.magicCost);
  player.recentSpells = recentSpells.slice(0, MAX_RECENT_SPELLS);
}

export function actionReadScroll(params: BaseParams, player: PlayerState, action: PlayerActionReadScroll): void {
  const item = player.equipment.find(item => item.id === action.itemId);
  const scrollItem = item && scrollItems[item.type];

  if (scrollItem) {
    const spell = spells[scrollItem.spellId];

    if (player.baseStats!.magic >= spell.intelligence) {
      player.spells = [
        ...player.spells,
        scrollItem.spellId as SpellIds
      ];
    }
  }
}