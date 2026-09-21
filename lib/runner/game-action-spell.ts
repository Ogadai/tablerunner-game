import { scrollItems } from "../games/items";
import { monsters } from "../games/monsters";
import { SpellIds, spells } from "../games/spells";
import { SpellDef, SpellTargetType } from "../games/types";
import { CharacterEffect, INamedTarget, ITarget, MonsterState, PlayerActionCast, PlayerActionReadScroll, PlayerState } from "../store/types";
import { BaseParams } from "./base-params";
import { genericAttackMonster, processAttackForDamage } from "./game-action-attack";
import { playerMessageAtLocation, soloMessageAtLocation } from "./game-messages";
import { specialSpellActions } from './special-spell-actions';

const MAX_RECENT_SPELLS = 2;

export function actionCastSpell(params: BaseParams, player: INamedTarget, action: PlayerActionCast): void {
  if (!player.spells.includes(action.spellId as SpellIds)) {
    // Doesn't have this spell
    return;
  }

  const spell = spells[action.spellId];
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
        playerMessageAtLocation(params, target.id, `**{player}** is dead`);
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
      const friendTarget = target as INamedTarget;
      const addedHealth = Math.min(spell.bonusStats.health,
        friendTarget.baseStats!.health - friendTarget.health);

      if (addedHealth > 0) {
        friendTarget.health += addedHealth;

        if (player.id === target.id) {
          soloMessageAtLocation(params, target.id,
            `**You** healed **yourself** for **${addedHealth}** health!`);
        } else {
          soloMessageAtLocation(params, target.id,
            `**${player.name}** healed **{player}** for **${addedHealth}** health!`);
          soloMessageAtLocation(params, player.id,
            `**{player}** healed **${player.name}** for **${addedHealth}** health!`);
        }
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

  const filterMonsters = (list: MonsterState[], alive: boolean = true) => list.filter(m => (alive === (m.health > 0)) &&
      (spell.pickTarget ? m.id === action.targetId : m.location === player.location.id)
    );
  const filterNamedTargets = (list: INamedTarget[], alive: boolean = true) => list.filter(t => (alive === (t.health > 0)) &&
      (spell.pickTarget ? t.id === action.targetId : t.location.id === player.location.id)
    );

  const isEvil = 'alignment' in player && player.alignment === 'evil';

  if (spell.targetType === SpellTargetType.enemy) {
    return isEvil
      ? [
          ...filterNamedTargets(params.gameState.players),
          ...filterNamedTargets(params.gameState.npcs.filter(t => t.id !== player.id))
        ]
      : filterMonsters(params.monsters);
  } else if (spell.targetType === SpellTargetType.friend) {
    return isEvil
      ? [
        ...filterMonsters(params.monsters),
        ...filterNamedTargets(params.gameState.npcs.filter(t => t.id === player.id))
      ] : [
          ...filterNamedTargets(params.gameState.players),
          ...filterNamedTargets(params.gameState.npcs),
        ];
  } else {
    return [
      ...filterMonsters(params.monsters, false),
      ...filterNamedTargets(params.gameState.players, false),
      ...filterNamedTargets(params.gameState.npcs, false),
    ];
  }
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
