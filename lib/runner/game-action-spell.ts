import { scrollItems } from "../games/items";
import { SpellIds, spells } from "../games/spells";
import { SpellDef, SpellTargetType } from "../games/types";
import { ITarget, MonsterState, PlayerActionCast, PlayerActionReadScroll, PlayerState } from "../store/types";
import { BaseParams } from "./base-params";
import { genericAttackMonster } from "./game-action-attack";
import { soloMessageAtLocation, playerMessageAtLocation } from "./game-messages";
import { specialSpellActions } from './special-spell-actions';

const MAX_RECENT_SPELLS = 2;

export function actionCastSpell(params: BaseParams, player: PlayerState, action: PlayerActionCast): void {
  if (!player.spells.includes(action.spellId as SpellIds)) {
    // Doesn't have this spell
    return;
  }

  const spell = spells[action.spellId];
  const targets = getSpellTargets(params, player, action);

  if (specialSpellActions[action.spellId]) {
    specialSpellActions[action.spellId](params, player, spell, targets);
  } else if (spell.targetType === SpellTargetType.enemy) {
    applySpellEnemy(params, player, spell, targets);
  } else if (spell.targetType === SpellTargetType.friend) {
    applySpellFriend(params, player, spell, targets);
  }

  const recentSpells: SpellIds[] = [
    action.spellId as SpellIds,
    ...(player.recentSpells || []).filter(id => id !== action.spellId)
  ];

  player.magic = Math.max(0, player.magic - spell.magicCost);
  player.recentSpells = recentSpells.slice(0, MAX_RECENT_SPELLS);
}

function applySpellEnemy(
  params: BaseParams,
  player: PlayerState,
  spell: SpellDef,
  targets: ITarget[]
) {
  for(const monster of targets) {
    genericAttackMonster(params, player, {
      name: spell.name,
      attack: player.baseStats!.magic,
      damage: spell.bonusStats.damage || 0,
    }, monster as MonsterState);
  }
}

function applySpellFriend(
  params: BaseParams,
  player: PlayerState,
  spell: SpellDef,
  targets: ITarget[]
) {
  for(const friend of targets) {
    const friendPlayer = friend as PlayerState;
    if (spell.bonusStats.health) {
      const addedHealth = Math.min(spell.bonusStats.health,
        friendPlayer.baseStats!.health - friendPlayer.health);
      friendPlayer.health += addedHealth;

      if (player.id === friend.id) {
        soloMessageAtLocation(params, friend.id,
          `**You** healed **yourself** for **${addedHealth}** health!`);
      } else {
        soloMessageAtLocation(params, friend.id,
          `**${player.name}** healed **{player}** for **${addedHealth}** health!`);
        soloMessageAtLocation(params, player.id,
          `**{player}** healed **${player.name}** for **${addedHealth}** health!`);
      }
    }
  }
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

      soloMessageAtLocation(params, player.id, `{player} learned **${spell.name}**`);
    }
  }
}

export function getSpellTargets(params: BaseParams, player: PlayerState, action: PlayerActionCast): ITarget[] {
  const spell = spells[action.spellId];
  if (spell.targetType === SpellTargetType.enemy) {
    return params.monsters.filter(m => (m.health > 0) &&
      (spell.pickTarget ? m.id === action.targetId : m.location === player.location.id)
    );
  } else if (spell.targetType === SpellTargetType.friend) {
    return params.gameState.players.filter(p => (p.health > 0) &&
      (spell.pickTarget ? p.id === action.targetId : p.location.id === player.location.id)
    );
  } else {
    return [
      ...params.monsters.filter(m => 
        (m.health === 0) && (spell.pickTarget ? m.id === action.targetId : m.location === player.location.id)
      ),
      ...params.gameState.players.filter(p => 
        (p.health === 0) && (spell.pickTarget ? p.id === action.targetId : p.location.id === player.location.id)
      )
    ];
  }
}
