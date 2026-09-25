import { ConsumableIds, consumableItems } from "../games/items";
import { monsters } from "../games/monsters";
import { getSpellActionCost, SpellIds, spells } from "../games/spells";
import { SpellDef } from "../games/types";
import { getPlayerActionsPerTurn, PlayerActionsPerTurn } from "../store/playerStats";
import { INamedTarget, ITarget, MonsterState, PlayerAction, PlayerActionAttack, PlayerActionCast, PlayerActionsState, PlayerActionType, PlayerActionUseItem } from "../store/types";
import { BaseParams } from "./base-params";

import { getAvailableSpellTargets, isMonsterCaster } from './spell-targets';
import { getMonsterStats } from './monster-stats';

interface ValueBase {
  value: number;
}

interface ActionsWithCosts extends ValueBase {
  cost: number;
  magic: number;
  restoreMagic?: number;
  priority?: number;
  exclusiveGroup?: string;
  action: PlayerAction;
}

interface ActionsList extends ValueBase {
  actions: PlayerAction[];
}

export function getCombatActions(params: BaseParams, npc: INamedTarget): PlayerActionsState {
  try {
    if (npc.health <= 0) return { actions: [] };
    const actionsPerTurn = getPlayerActionsPerTurn(npc);

    let nextId = 1;
    const actionsWithCosts = getAvailableActions(params, npc, actionsPerTurn)
      .map(a => ({ ...a, action: { ...a.action, id: nextId++ } }));
    if (actionsWithCosts.length === 0) {
      return { actions: [] };
    }

    const candidates = [
      pickActions(actionsWithCosts, actionsPerTurn.total, npc.magic, npc.baseStats!.magic),
    ];

    if (actionsWithCosts.length > 1) {
      candidates.push(pickActions(actionsWithCosts, actionsPerTurn.total, npc.magic, npc.baseStats!.magic));
    }
    if (actionsWithCosts.length > 2) {
      candidates.push(pickActions(actionsWithCosts, actionsPerTurn.total, npc.magic, npc.baseStats!.magic));
    }

    return {
      actions: weightedRandomPick(candidates).actions
    };
  } catch(error) {
    console.error('Error getting combat actions', error);
    return { actions: [] };
  }
};

function getAvailableActions(params: BaseParams, npc: INamedTarget, actionsPerTurn: PlayerActionsPerTurn): ActionsWithCosts[] {
  const attackTargets = isMonsterCaster(params, npc)
    ? [
        ...params.gameState.players,
        ...params.gameState.npcs.filter(target => target.id !== npc.id),
      ].filter(target => target.location.id === npc.location.id && target.health > 0)
    : params.monsters.filter(m => m.location === npc.location.id && m.health > 0);
  const actions: (ActionsWithCosts | null)[] =
    attackTargets.map(target => getAttackAction(params, npc, target, actionsPerTurn));

  // May want to double up on attacks if we have fast attacks
  while (actions.length > 0 && actions.length < (actionsPerTurn.total / actionsPerTurn.attack)) {
    actions.push(
      ...attackTargets.map(target => getAttackAction(params, npc, target, actionsPerTurn))
    );
  }

  actions.push(getHealPotionAction(params, npc));
  actions.push(getMagicPotionAction(params, npc));

  for(const spellId of npc.spells) {
    actions.push(
      ...getCastSpellActions(params, npc, spellId, actionsPerTurn),
    );
  }

  return actions.filter(a => !!a && a.value > 0) as ActionsWithCosts[];
}

function getAttackAction(params: BaseParams, npc: INamedTarget, target: MonsterState | INamedTarget, actionsPerTurn: PlayerActionsPerTurn): ActionsWithCosts {
  const action: PlayerActionAttack = {
    id: -1,
    target: target.id,
    type: PlayerActionType.Attack,
    description: `Attack ${'type' in target ? monsters[target.type].name : target.name}`
  };

  return {
    cost: actionsPerTurn.attack,
    magic: 0,
    value: expectedDamage(npc.baseStats!.damage, npc.baseStats!.attack, target),
    action
  };
}

function getHealPotionAction(params: BaseParams, npc: INamedTarget): ActionsWithCosts | null {
  const potions = npc.equipment.filter(e => e.type === ConsumableIds.healingPotion);
  const greaterPotions = npc.equipment.filter(e => e.type === ConsumableIds.greaterHealingPotion);
  const heal = consumableItems[ConsumableIds.healingPotion];
  const greaterHeal = consumableItems[ConsumableIds.greaterHealingPotion];

  if (potions.length > 0 || greaterPotions.length > 0) {
    const greaterHealth = greaterHeal.bonusStats!.health || 12;
    const minHealth = (potions.length > 0 ? heal.bonusStats!.health : greaterHealth) || 5;

    if (npc.health <= npc.baseStats!.health - minHealth) {
      const item = (greaterPotions.length > 0 && npc.health <= npc.baseStats!.health - greaterHealth)
          ? greaterPotions[0] : potions[0];

      const action: PlayerActionUseItem = {
        id: -1,
        itemId: item.id,
        type: PlayerActionType.UseItem,
        description: `Use ${consumableItems[item.type].name}`
      };

      return {
        cost: consumableItems[item.type].useCost,
        magic: 0,
        value: Math.min(consumableItems[item.type].bonusStats!.health ?? 0, npc.baseStats!.health - npc.health)
          * (npc.baseStats!.health / npc.health),
        priority: npc.health <= npc.baseStats!.health / 2 ? 2 : 0,
        action
      };
    }
  }
  return null;
}

function getMagicPotionAction(params: BaseParams, npc: INamedTarget): ActionsWithCosts | null {
  const potions = npc.equipment.filter(e => e.type === ConsumableIds.manaPotion);
  const manaPotion = consumableItems[ConsumableIds.manaPotion];

  if (potions.length > 0) {
    const magic = manaPotion.bonusStats!.magic || 5;

    if (npc.magic <= npc.baseStats!.magic - magic) {
      const item = potions[0];

      const action: PlayerActionUseItem = {
        id: -1,
        itemId: item.id,
        type: PlayerActionType.UseItem,
        description: `Use ${consumableItems[item.type].name}`
      };

      return {
        cost: consumableItems[item.type].useCost,
        magic: 0,
        value: magic * (1 + (npc.baseStats!.magic - npc.magic) / npc.baseStats!.magic),
        restoreMagic: magic,
        priority: npc.spells.length > 0 && npc.spells.every(id => spells[id].magicCost > npc.magic) ? 1 : 0,
        action
      };
    }
  }
  return null;
}

function getCastSpellActions(params: BaseParams, npc: INamedTarget, spellId: string, actionsPerTurn: PlayerActionsPerTurn): ActionsWithCosts[] {
  const spell = spells[spellId];
  const targets = getAvailableSpellTargets(params, npc, spell);
  if (targets.length === 0) {
    return [];
  }
  const necromancy = spellId === SpellIds.raiseDead || spellId === SpellIds.animateCorpse || spellId === SpellIds.familiar;
  if (necromancy && isMonsterCaster(params, npc)) {
    const undead = params.monsters.filter(m => m.id !== npc.id && m.location === npc.location.id
      && m.health > 0 && (m.type === 'skeleton' || m.zombie));
    if (spellId === SpellIds.familiar) {
      if (undead.length >= 1) return [];
    }
    if (undead.length >= 4) return [];
  }
  // Include spells that become affordable after the available mana potion.
  const manaPotion = getMagicPotionAction(params, npc);
  const availableMagic = Math.min(npc.baseStats!.magic, npc.magic + (manaPotion?.restoreMagic ?? 0));
  const castCount = Math.min(
    Math.floor(actionsPerTurn.total / getSpellActionCost(spell, npc.baseStats!.magic)),
    Math.floor(availableMagic / spell.magicCost),
  );
  const actionsWithCosts: ActionsWithCosts[] = [];
  for(let n = 0; n < castCount; n++) {
    const target: ITarget | null = spell.pickTarget
      ? targets[Math.floor(Math.random() * targets.length)]
      : null;

    const action: PlayerActionCast = {
      id: -1,
      spellId: spellId,
      type: PlayerActionType.Cast,
      description: `Cast ${spell.name}`,
      targetId: target ? target.id : undefined
    };

    actionsWithCosts.push({
      cost: getSpellActionCost(spell, npc.baseStats!.magic),
      magic: spell.magicCost,
      exclusiveGroup: necromancy ? 'necromancy' : undefined,
      value: getSpellValue(npc, spell, target ? [target] : targets) / (npc.recentSpells?.includes(spellId as SpellIds) ? 1.3 : 1),
      action
    });
  }

  return actionsWithCosts;
}

/** Estimate useful damage from the combat hit probability, capped by remaining health. */
function expectedDamage(damage: number, attack: number, target: ITarget): number {
  const defence = 'type' in target ? getMonsterStats(target as MonsterState).defence : (target as INamedTarget).baseStats!.defence;
  const hitChance = defence <= 0 ? 1 : attack <= 0 ? 0
    : attack >= defence ? 1 - defence / (2 * attack) : attack / (2 * defence);
  return Math.min(target.health, (damage + 1) / 2) * hitChance;
}

function getSpellValue(npc: INamedTarget, spell: SpellDef, targets: ITarget[]): number {
  const sumValue = (valueFn: (target: ITarget) => number) =>
        targets.reduce((total, t) => total + valueFn(t), 0);

  if (spell.bonusStats.damage) {
    return sumValue(t => expectedDamage(spell.bonusStats.damage!, npc.baseStats!.magic, t));
  } else if (spell.bonusStats.health) {
    return sumValue(t => 10 / (t.health / ('type' in t ? getMonsterStats(t as MonsterState).health : (t as INamedTarget).baseStats!.health)) - 10);
  } else if (spell.bonusStats.special) {
    // Summons contribute over several turns, comparable to a strong attack.
    return 15;
  } else {
    const sumBonuses = ['attack', 'damage', 'defence', 'speed']
      .reduce((total, bonus) => total + Math.abs((spell.bonusStats as any)[bonus] || 0), 0)
    return targets.length * sumBonuses;
  }
}

function pickActions(actionsWithCosts: ActionsWithCosts[], maxCost: number, initialMagic: number, maxMagic: number): ActionsList {
  let remainActions = [...actionsWithCosts];
  const actions: PlayerAction[] = [];
  let value = 0;
  let cost = 0;
  let magic = initialMagic;

  let canAddMore = true;
  while(canAddMore) {
    const affordable = remainActions.filter(a => a.cost <= maxCost - cost && a.magic <= magic);
    if (affordable.length > 0) {
      const priority = Math.max(...affordable.map(a => a.priority ?? 0));
      const nextAction = weightedRandomPick(affordable.filter(a => (a.priority ?? 0) === priority));
      value += nextAction.value;
      cost += nextAction.cost;
      magic = Math.min(maxMagic, magic - nextAction.magic + (nextAction.restoreMagic ?? 0));
      actions.push(nextAction.action)

      remainActions = remainActions.filter(a => a.action.id !== nextAction.action.id
        && (!nextAction.exclusiveGroup || a.exclusiveGroup !== nextAction.exclusiveGroup));
    } else {
      canAddMore = false;
    }
  }

  return { actions, value };
}

function weightedRandomPick<T extends ValueBase>(list: T[]): T {
  const totalWeight = list.reduce((total, item) => total + item.value, 0);
  let selection = Math.random() * totalWeight;

  for (let index = 0; index < list.length; index++) {
    selection -= list[index].value;
    if (selection < 0) {
      return list[index];
    }
  }

  return list[list.length - 1];
}

// Preserve the NPC entry point for callers.
export const getNpcActions = getCombatActions;
