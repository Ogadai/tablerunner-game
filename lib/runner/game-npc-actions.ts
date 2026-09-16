import { ConsumableIds, consumableItems } from "../games/items";
import { monsters } from "../games/monsters";
import { spells } from "../games/spells";
import { SpellDef, SpellTargetType } from "../games/types";
import { getPlayerActionsPerTurn, getPlayerActionsCosts, PlayerActionsPerTurn } from "../store/playerStats";
import { INamedTarget, ITarget, MonsterState, NPCState, PlayerAction, PlayerActionAttack, PlayerActionCast, PlayerActionsState, PlayerActionType, PlayerActionUseItem } from "../store/types";
import { BaseParams } from "./base-params";

interface ValueBase {
  value: number;
}

interface ActionsWithCosts extends ValueBase {
  cost: number;
  magic: number;
  action: PlayerAction;
}

interface ActionsList extends ValueBase {
  actions: PlayerAction[];
}

export function getNpcActions(params: BaseParams, npc: NPCState): PlayerActionsState {
  try {
    const actionsPerTurn = getPlayerActionsPerTurn(npc);

    let nextId = 1;
    const actionsWithCosts = getAvailableActions(params, npc, actionsPerTurn)
      .map(a => ({ ...a, action: { ...a.action, id: nextId++ } }));
    if (actionsWithCosts.length === 0) {
      return { actions: [] };
    }

    const candidates = [
      pickActions(actionsWithCosts, actionsPerTurn.total, npc.magic),
    ];

    if (actionsWithCosts.length > 1) {
      candidates.push(pickActions(actionsWithCosts, actionsPerTurn.total, npc.magic));
    }
    if (actionsWithCosts.length > 2) {
      candidates.push(pickActions(actionsWithCosts, actionsPerTurn.total, npc.magic));
    }

    return {
      actions: weightedRandomPick(candidates).actions
    };
  } catch(error) {
    console.error('Error getting NPC actions', error);
    return { actions: [] };
  }
};

function getAvailableActions(params: BaseParams, npc: NPCState, actionsPerTurn: PlayerActionsPerTurn): ActionsWithCosts[] {
  // Pick a target monster
  const monstersAtLocation = params.monsters.filter(m => m.location === npc.location.id && m.health > 0);
  const actions: (ActionsWithCosts | null)[] =
    monstersAtLocation.map(m => getAttackAction(params, npc, m, actionsPerTurn));

  // May want to double up on attacks if we have fast attacks
  while (actions.length > 0 && actions.length < (actionsPerTurn.total / actionsPerTurn.attack)) {
    actions.push(
      ...monstersAtLocation.map(m => getAttackAction(params, npc, m, actionsPerTurn))
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

function getAttackAction(params: BaseParams, npc: NPCState, target: MonsterState, actionsPerTurn: PlayerActionsPerTurn): ActionsWithCosts {
  const action: PlayerActionAttack = {
    id: -1,
    target: target.id,
    type: PlayerActionType.Attack,
    description: `Attack ${monsters[target.type].name}`
  };

  return {
    cost: actionsPerTurn.attack,
    magic: 0,
    value: (npc.baseStats!.damage / 10) * (npc.baseStats!.attack / 10) * target.health,
    action
  };
}

function getHealPotionAction(params: BaseParams, npc: NPCState): ActionsWithCosts | null {
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
        value: 10 / (npc.health / npc.baseStats!.health) - 10,
        action
      };
    }
  }
  return null;
}

function getMagicPotionAction(params: BaseParams, npc: NPCState): ActionsWithCosts | null {
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
        value: 3 / (npc.magic / npc.baseStats!.magic) - 3,
        action
      };
    }
  }
  return null;
}

function getCastSpellActions(params: BaseParams, npc: NPCState, spellId: string, actionsPerTurn: PlayerActionsPerTurn): ActionsWithCosts[] {
  const spell = spells[spellId];
  const targets = getSpellTargets(params, npc, spell);
  if (targets.length === 0) {
    return [];
  }
  const monstersAtLocation = params.monsters.filter(m => (m.health > 0) && (m.location === npc.location.id))
  if (monstersAtLocation.length == 0 && !spell.bonusStats.health  && !spell.bonusStats.magic) {
    return [];
  }

  const castCount = Math.min(
    Math.floor(actionsPerTurn.total / spell.actionCost),
    Math.floor(npc.magic / spell.magicCost),
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
      cost: spell.actionCost,
      magic: spell.magicCost,
      value: getSpellValue(npc, spell, target ? [target] : targets),
      action
    });
  }

  return actionsWithCosts;
}

function getSpellValue(npc: NPCState, spell: SpellDef, targets: ITarget[]): number {
  const sumValue = (valueFn: (target: ITarget) => number) =>
        targets.reduce((total, t) => total + valueFn(t), 0);

  if (spell.bonusStats.damage) {
    return sumValue(t => (spell.bonusStats.damage! / 10) * (npc.baseStats!.magic / 10) * t.health);
  } else if (spell.bonusStats.health) {
    return sumValue(t => 10 / (t.health / (t as INamedTarget).baseStats!.health) - 10);
  } else {
    const sumBonuses = ['attack', 'damage', 'defence', 'speed']
      .reduce((total, bonus) => total + Math.abs((spell.bonusStats as any)[bonus] || 0), 0)
    return targets.length * sumBonuses;
  }
}

function pickActions(actionsWithCosts: ActionsWithCosts[], maxCost: number, maxMagic: number): ActionsList {
  let remainActions = [...actionsWithCosts];
  const actions: PlayerAction[] = [];
  let value = 0;
  let cost = 0;
  let magic = 0;

  let canAddMore = true;
  while(canAddMore) {
    const affordable = remainActions.filter(a => a.cost <= maxCost - cost && a.magic <= maxMagic - magic);
    if (affordable.length > 0) {
      const nextAction = weightedRandomPick(affordable);
      value += nextAction.value;
      cost += nextAction.cost;
      actions.push(nextAction.action)

      remainActions = remainActions.filter(a => a.action.id !== nextAction.action.id);
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

function getSpellTargets(params: BaseParams, npc: INamedTarget, spell: SpellDef): ITarget[] {
  const filterMonsters = (list: MonsterState[]) => list.filter(m => (m.health > 0) &&
      (m.location === npc.location.id)
    );
  const filterNamedTargets = (list: INamedTarget[]) => list.filter(t => (t.health > 0) &&
      (t.location.id === npc.location.id)
    );

  if (spell.targetType === SpellTargetType.enemy) {
    return filterMonsters(params.monsters);
  } else if (spell.targetType === SpellTargetType.friend) {
    return [
      ...filterNamedTargets(params.gameState.players),
      ...filterNamedTargets(params.gameState.npcs),
    ];
  } else {
    return [
      ...filterMonsters(params.monsters),
      ...filterNamedTargets(params.gameState.players),
      ...filterNamedTargets(params.gameState.npcs),
    ];
  }
}
