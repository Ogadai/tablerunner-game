import { scrollItems } from "../games/items";
import { monsters } from "../games/monsters";
import { SpellIds, spells } from "../games/spells";
import { SpellDef } from "../games/types";
import { CharacterEffect, INamedTarget, ITarget, MonsterState, PlayerActionCast, PlayerActionReadScroll, PlayerState } from "../store/types";
import { BaseParams } from "./base-params";
import { genericAttackMonster, handlePlayerIsDead, processAttackForDamage } from "./game-action-attack";
import { playerMessageAtLocation, soloMessageAtLocation } from "./game-messages";
import { specialSpellActions } from './special-spell-actions';

import { getAvailableSpellTargets } from './spell-targets';
import { getMonsterStats } from './monster-stats';

const MAX_RECENT_SPELLS = 2;

export function actionCastSpell(params: BaseParams, player: INamedTarget, action: PlayerActionCast): void {
  if (!player.spells.includes(action.spellId as SpellIds)) {
    // Doesn't have this spell
    return;
  }

  const spell = spells[action.spellId];
  if (!spell || player.health <= 0 || player.magic < spell.magicCost) return;
  const targets = getSpellTargets(params, player, action);

  if (targets.length > 0) {
    if (specialSpellActions[action.spellId]) {
      specialSpellActions[action.spellId](params, player, spell, targets);
    } else if (spell.bonusStats.damage! > 0) {
      // Regular attack spell with damage
      applySpellEnemy(params, player, spell, targets);
    } else {
      // Spell to apply effects to friend or foe
      applySpellEffects(params, player, spell, targets);
    }

    const recentSpells: SpellIds[] = [
      action.spellId as SpellIds,
      ...(player.recentSpells || []).filter(id => id !== action.spellId)
    ];

    player.magic = Math.max(0, player.magic - spell.magicCost);
    player.recentSpells = recentSpells.slice(0, MAX_RECENT_SPELLS);
  }
}

function applySpellEnemy(
  params: BaseParams,
  player: INamedTarget,
  spell: SpellDef,
  targets: ITarget[]
) {
  for(const monster of targets) {
    const attackStats = {
      name: spell.name,
      attack: player.baseStats!.magic,
      damage: spell.bonusStats.damage || 0,
    };
    if ('type' in monster) {
      genericAttackMonster(params, player, attackStats, monster as MonsterState);
    } else {
      const target = monster as INamedTarget;
      const damage = processAttackForDamage(attackStats, target.baseStats!);
      target.health = Math.max(0, target.health - damage);

      playerMessageAtLocation(params, target.id,
        damage > 0
          ? `**${player.name}** ${spell.name} hit **{player}** for **${damage}** damage`
          : `**${player.name}** ${spell.name} missed **{player}**`);

      if (target.health <= 0) {
        handlePlayerIsDead(params, target);
      }
    }
  }
}

function applySpellEffects(
  params: BaseParams,
  player: INamedTarget,
  spell: SpellDef,
  targets: ITarget[]
) {
  if (spell.bonusStats.health) {
    for(const target of targets) {
      const friendTarget = target;
      const maxHealth = 'type' in target ? getMonsterStats(target as MonsterState).health : (target as INamedTarget).baseStats!.health;
      const addedHealth = Math.min(spell.bonusStats.health,
        maxHealth - friendTarget.health);

      if (addedHealth > 0) {
        friendTarget.health += addedHealth;

        const targetName = 'type' in target ? monsters[(target as MonsterState).type].name : (target as INamedTarget).name;
        playerMessageAtLocation(params, player.id,
          player.id === target.id
            ? `**{player}** healed themselves for **${addedHealth}** health!`
            : `**{player}** healed **${targetName}** for **${addedHealth}** health!`);

      }
    }
  } else {
    // Apply spell effects to all targets
    addEffectToTargets(targets, {
      turns: spell.bonusStats.turns || 1,
      description: spell.name,
      attack: spell.bonusStats.attack,
      defence: spell.bonusStats.defence,
      speed: spell.bonusStats.speed,
    });

    const getTargetName = (t: ITarget) =>
      (t as INamedTarget).name
        ? (t as INamedTarget).name
        : monsters[(t as MonsterState).type].name;

    const joinWithAnd = (names: string[]) =>
        names.reduce( (res, v, i) => i === names.length - 2 ? res + v + ' and ' : res + v + ( i == names.length - 1? '' : ', '), '' );

    const targetNames = joinWithAnd(targets.map(getTargetName));

    playerMessageAtLocation(params, player.id,
      `**{player}** cast **${spell.name}** on **${targetNames}**`);
  }
}

export function actionReadScroll(params: BaseParams, player: PlayerState, action: PlayerActionReadScroll): void {
  const item = player.equipment.find(item => item.id === action.itemId);
  const scrollItem = item && scrollItems[item.type];

  if (scrollItem) {
    const spell = spells[scrollItem.spellId];

    if (player.baseStats!.magic >= spell.intelligence
      && !player.spells.includes(scrollItem.spellId as SpellIds)
    ) {
      player.spells = [
        ...player.spells,
        scrollItem.spellId as SpellIds
      ];
      player.equipment = player.equipment.filter(e => e.id !== action.itemId);

      soloMessageAtLocation(params, player.id, `{player} learned **${spell.name}**`);
    }
  }
}

export function getSpellTargets(params: BaseParams, player: INamedTarget, action: PlayerActionCast): ITarget[] {
  const spell = spells[action.spellId];

  return getAvailableSpellTargets(params, player, spell)
    .filter(target => !spell.pickTarget || target.id === action.targetId);
}

const addEffectToTargets = (targets: ITarget[], newEffect: CharacterEffect) => {
  for(const target of targets) {
    target.effects = [
      ...(target.effects || [])
        .filter(e => e.description !== newEffect.description),
      { ...newEffect },
    ];
  }
}
