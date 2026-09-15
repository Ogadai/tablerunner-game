import { monsters } from "../games/monsters";
import { getPlayerActionsPerTurn, getPlayerActionsCosts, PlayerActionsPerTurn } from "../store/playerStats";
import { MonsterState, NPCState, PlayerAction, PlayerActionAttack, PlayerActionsState, PlayerActionType } from "../store/types";
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
  const actionsPerTurn = getPlayerActionsPerTurn(npc);

  let nextId = 1;
  const actionsWithCosts = getAvailableActions(params, npc, actionsPerTurn)
    .map(a => ({ ...a, action: { ...a.action, id: nextId++ } }));

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
};

function getAvailableActions(params: BaseParams, npc: NPCState, actionsPerTurn: PlayerActionsPerTurn): ActionsWithCosts[] {
  // Pick a target monster
  const monstersAtLocation = params.monsters.filter(m => m.location === npc.location.id && m.health > 0);
  const attackActions = monstersAtLocation.map(m => getAttackAction(params, npc, m, actionsPerTurn));

  while (attackActions.length > 0 && attackActions.length < (actionsPerTurn.total / actionsPerTurn.attack)) {
    attackActions.push(
      ...monstersAtLocation.map(m => getAttackAction(params, npc, m, actionsPerTurn))
    );
  }

  return [
    ...attackActions
  ];
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
    value: npc.baseStats!.attack / npc.baseStats!.defence * target.health,
    action
  };
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