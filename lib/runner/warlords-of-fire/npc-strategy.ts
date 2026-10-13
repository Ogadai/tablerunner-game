import { warlordsOfFire } from '@/lib/games/maps/warlords-of-fire';
import { monsters, mostersExcludeFromAutoPopulate } from '@/lib/games/monsters';
import { getCombatStats, getPlayerActionsCosts } from '@/lib/store/playerStats';
import { INamedTarget, MonsterState, NPCState, PlayerActionFastTravel, PlayerActionMove, PlayerActionRecruit, PlayerActionsState, PlayerActionType } from '@/lib/store/types';
import { BaseParams } from '../base-params';
import { getEnemies, getFriends, RelationshipParams } from '../game-friends-or-enemies';
import { getNpcActions } from '../game-npc-actions';
import { getMonsterCombatant } from '../monster-combatant';
import { playerMonsters } from './monsters';
import { getMonsterCost, getWarlordAvailableMonsters } from './recruit-helper';
import { NpcDecision, TeamStateDef } from './territory-state';

export const NPC_RUN_STEPS = 5;
const OVERWHELMING_ODDS = 1.8;
const MAX_RECRUITS = 3;
const locationsById = new Map(warlordsOfFire.locations.map(location => [location.id, location]));

interface NpcOption {
  decision?: NpcDecision;
  actions?: PlayerActionsState;
  cost: number;
  benefit: number;
}

function combatPower(target: INamedTarget): number {
  const stats = getCombatStats(target);
  const healthRatio = Math.min(1, target.health / Math.max(1, stats.health));
  return healthRatio * (stats.attack + stats.damage + stats.defence + stats.health + stats.magic * 0.5);
}

interface NpcPlanningContext {
  territory: Set<number>;
  monstersAt: (location: number) => MonsterState[];
  enemiesAt: (location: number) => INamedTarget[];
  enemyPowerAt: (location: number) => number;
  monsterPower: (monster: MonsterState) => number;
  blocked: (location: number, direction: string) => boolean;
  routes?: Map<number, number[]>;
}

/** One commander's planning snapshot; party membership is still read from live monsters. */
function createPlanningContext(params: BaseParams, npc: NPCState, team: TeamStateDef): NpcPlanningContext {
  const locations = new Map<number, RelationshipParams>();
  const atLocation = (location: number): RelationshipParams => {
    let local = locations.get(location);
    if (!local) {
      local = { gameState: { players: [], npcs: [] }, monsters: [] };
      locations.set(location, local);
    }
    return local;
  };
  for (const player of params.gameState.players) {
    if (player.health > 0) atLocation(player.location.id).gameState.players.push(player);
  }
  for (const target of params.gameState.npcs) {
    if (target.health > 0) atLocation(target.location.id).gameState.npcs.push(target);
  }
  for (const monster of params.monsters) {
    if (monster.health > 0) atLocation(monster.location).monsters.push(monster);
  }
  const blockedMoves = new Map<number, Set<string>>();
  for (const move of params.blockedMoves) {
    if (!blockedMoves.has(move.location)) blockedMoves.set(move.location, new Set());
    blockedMoves.get(move.location)!.add(move.direction);
  }
  const enemies = new Map<number, INamedTarget[]>();
  const enemyPowers = new Map<number, number>();
  const monsterPowers = new WeakMap<MonsterState, number>();
  const enemiesAt = (location: number): INamedTarget[] => {
    let targets = enemies.get(location);
    if (!targets) {
      targets = getEnemies(atLocation(location), { ...npc, location: { id: location, description: '', move: [] } });
      enemies.set(location, targets);
    }
    return targets;
  };
  return {
    territory: new Set(team.territory),
    monstersAt: location => locations.get(location)?.monsters ?? [],
    enemiesAt,
    enemyPowerAt: location => {
      let power = enemyPowers.get(location);
      if (power === undefined) {
        power = enemiesAt(location).reduce((total, enemy) => total + combatPower(enemy), 0);
        enemyPowers.set(location, power);
      }
      return power;
    },
    monsterPower: monster => {
      let power = monsterPowers.get(monster);
      if (power === undefined) {
        power = combatPower(getMonsterCombatant(monster));
        monsterPowers.set(monster, power);
      }
      return power;
    },
    blocked: (location, direction) => blockedMoves.get(location)?.has(direction) ?? false,
  };
}

/** Routes stay in owned territory, respect blocked edges and avoid live enemies. */
export function getNpcTerritoryRoutes(params: BaseParams, npc: NPCState, team: TeamStateDef,
  context: NpcPlanningContext = createPlanningContext(params, npc, team)): Map<number, number[]> {
  if (context.routes) return context.routes;
  const routes = new Map<number, number[]>();
  context.routes = routes;
  if (context.enemiesAt(npc.location.id).length > 0) return routes;
  const queue = [npc.location.id];
  routes.set(npc.location.id, []);
  for (let i = 0; i < queue.length; i++) {
    const location = locationsById.get(queue[i]);
    for (const move of location?.move ?? []) {
      if (routes.has(move.id) || !context.territory.has(move.id)
          || context.blocked(queue[i], move.direction) || context.enemiesAt(move.id).length > 0) continue;
      routes.set(move.id, [...routes.get(queue[i])!, move.id]);
      queue.push(move.id);
    }
  }
  return routes;
}

function moveOrder(direction: PlayerActionMove['direction']): PlayerActionsState {
  const action: PlayerActionMove = { id: 1, type: PlayerActionType.Move, direction, description: `Move ${direction}` };
  return { actions: [action] };
}

function runOrder(route: number[]): PlayerActionsState {
  const targetLocation = route[Math.min(NPC_RUN_STEPS, route.length) - 1];
  const action: PlayerActionFastTravel = {
    id: 1, type: PlayerActionType.FastTravel, targetLocation, description: `Run to location ${targetLocation}`,
  };
  return { actions: [action] };
}

function releaseParty(params: BaseParams, npc: NPCState): void {
  for (const monster of params.monsters.filter(monster => monster.masterId === npc.id)) {
    delete monster.masterId;
  }
}

function gatherParty(npc: NPCState, enemyPower: number, context: NpcPlanningContext): void {
  const localMonsters = context.monstersAt(npc.location.id);
  let force = combatPower(npc) + localMonsters
    .filter(monster => monster.masterId === npc.id)
    .reduce((total, monster) => total + context.monsterPower(monster), 0);
  const available = localMonsters.filter(monster => monster.team === npc.team && !monster.masterId)
    .sort((a, b) => context.monsterPower(b) - context.monsterPower(a));
  for (const monster of available) {
    if (force >= enemyPower * 1.4) break;
    monster.masterId = npc.id;
    force += context.monsterPower(monster);
  }
}

function eligibleRecruits(params: BaseParams, npc: NPCState): string[] {
  return [...new Set(getWarlordAvailableMonsters(params.gameState, npc.team ?? npc.id))]
    .filter(type => monsters[type] && !playerMonsters.includes(type) && !mostersExcludeFromAutoPopulate.includes(type));
}

function continueDecision(params: BaseParams, npc: NPCState, team: TeamStateDef, context: NpcPlanningContext): PlayerActionsState | undefined {
  const decision = team.npcDecision;
  if (!decision) return;
  const routes = getNpcTerritoryRoutes(params, npc, team, context);
  if (decision.type === 'retreat') {
    if (npc.location.id === decision.location) {
      releaseParty(params, npc);
    } else {
      const move = locationsById.get(npc.location.id)?.move
        .find(move => move.id === decision.location && !context.blocked(npc.location.id, move.direction));
      if (move) return moveOrder(move.direction);
    }
  } else if (decision.type === 'expand') {
    if (npc.location.id !== decision.location
        && (!context.territory.has(decision.location) || context.enemiesAt(decision.location).length > 0)) {
      const route = routes.get(decision.from);
      const move = locationsById.get(decision.from)?.move
        .find(move => move.id === decision.location && !context.blocked(decision.from, move.direction));
      if (route && move) {
        if (route.length > 0) return runOrder(route);
        const threat = context.enemyPowerAt(decision.location);
        const force = combatPower(npc) + getFriends(params, npc).filter(friend => friend.health > 0)
          .reduce((total, friend) => total + combatPower(friend), 0);
        if (threat >= force * OVERWHELMING_ODDS) {
          delete team.npcDecision;
          return;
        }
        gatherParty(npc, threat, context);
        return moveOrder(move.direction);
      }
    }
  } else if (context.territory.has(decision.location)) {
    const route = routes.get(decision.location);
    if (route?.length) return runOrder(route);
    if (route) {
      releaseParty(params, npc);
      const eligible = eligibleRecruits(params, npc);
      let coins = team.coins;
      const recruits = decision.recruits.filter(type => {
        if (!eligible.includes(type) || getMonsterCost(type) > coins) return false;
        coins -= getMonsterCost(type);
        return true;
      });
      if (recruits.length > 0) {
        const action: PlayerActionRecruit = {
          id: 1, type: PlayerActionType.Recruit, monsters: recruits, description: `Recruit ${recruits.length} monsters`,
        };
        return { actions: [action] };
      }
    }
  }
  // Completed, lost, unaffordable or blocked goals can be replaced.
  delete team.npcDecision;
}

function reinforcementOptions(params: BaseParams, npc: NPCState, team: TeamStateDef, routes: Map<number, number[]>, context: NpcPlanningContext): NpcOption[] {
  const types = eligibleRecruits(params, npc).map(type => ({
    type, cost: getMonsterCost(type),
    power: context.monsterPower({
      id: 'recruit', type, health: monsters[type].baseStats.health, location: npc.location.id, team: npc.team,
    }),
  })).filter(type => type.cost <= team.coins);
  const options: NpcOption[] = [];
  for (const [location, route] of routes) {
    if (!context.territory.has(location)) continue;
    const garrison = context.monstersAt(location).filter(monster => monster.team === npc.team && !monster.masterId)
      .reduce((total, monster) => total + context.monsterPower(monster), 0);
    const nearbyThreat = Math.max(0, ...(
      locationsById.get(location)?.move ?? []
    ).map(move => context.enemyPowerAt(move.id)));
    for (const { type, cost, power: unitPower } of types) {
      const deficit = Math.max(unitPower, nearbyThreat * 0.75) - garrison;
      if (deficit <= 0) continue;
      const count = Math.min(MAX_RECRUITS, Math.ceil(deficit / Math.max(1, unitPower)), Math.floor(team.coins / cost));
      options.push({
        decision: { type: 'reinforce', location, recruits: Array.from({ length: count }, () => type) },
        cost: 1 + Math.ceil(route.length / NPC_RUN_STEPS) + count * cost / Math.max(20, team.coins),
        benefit: 12 * Math.min(deficit, count * unitPower) / Math.max(1, unitPower) + nearbyThreat / Math.max(1, unitPower),
      });
    }
  }
  return options;
}

/** Benefits use income/defence/recovery value; costs include travel, coins and combat risk. */
export function getNpcOptions(params: BaseParams, npc: NPCState, team: TeamStateDef,
  context: NpcPlanningContext = createPlanningContext(params, npc, team)): NpcOption[] {
  const routes = getNpcTerritoryRoutes(params, npc, team, context);
  const options: NpcOption[] = [];
  const expansionBias = 1 + 3 * Math.exp(-params.gameState.turn / 20);
  const npcPower = combatPower(npc);
  for (const [from, route] of routes) {
    const localForce = npcPower + context.monstersAt(from)
      .filter(monster => monster.team === npc.team && (!monster.masterId || monster.masterId === npc.id))
      .reduce((total, monster) => total + context.monsterPower(monster), 0);
    for (const move of locationsById.get(from)?.move ?? []) {
      const threat = context.enemyPowerAt(move.id);
      const owned = context.territory.has(move.id);
      if ((owned && threat === 0) || context.blocked(from, move.direction)) continue;
      const odds = threat / Math.max(1, localForce);
      // Avoid knowingly hopeless invasions; unexpected reinforcements can still force a retreat.
      if (odds >= OVERWHELMING_ODDS) continue;
      options.push({
        decision: { type: 'expand', from, location: move.id },
        cost: 1 + Math.ceil(route.length / NPC_RUN_STEPS) + odds * 2,
        benefit: (owned ? 15 : 10 * expansionBias) / (1 + odds * odds),
      });
    }
  }
  options.push(...reinforcementOptions(params, npc, team, routes, context));
  const stats = getCombatStats(npc);
  const recovery = getNpcActions(params, npc);
  options.push({
    actions: recovery,
    cost: 1 + getPlayerActionsCosts(npc, recovery) / 20,
    benefit: 1 + 20 * (1 - npc.health / Math.max(1, stats.health))
      + 5 * (1 - npc.magic / Math.max(1, stats.magic)) + (recovery.actions.length > 0 ? 3 : 0),
  });
  return options;
}

export function planNpcTurn(params: BaseParams, npc: NPCState, team: TeamStateDef): PlayerActionsState | null {
  const context = createPlanningContext(params, npc, team);
  const enemies = context.enemiesAt(npc.location.id);
  if (enemies.length > 0) {
    const friendlyPower = combatPower(npc) + getFriends(params, npc).filter(friend => friend.health > 0)
      .reduce((total, friend) => total + combatPower(friend), 0);
    const enemyPower = enemies.reduce((total, enemy) => total + combatPower(enemy), 0);
    const previous = team.npcDecision?.type === 'expand' && team.npcDecision.location === npc.location.id
      ? team.npcDecision.from : undefined;
    const retreat = locationsById.get(npc.location.id)?.move
      .find(move => (previous !== undefined ? move.id === previous : move.direction === npc.retreatDirection)
        && !context.blocked(npc.location.id, move.direction));
    if (enemyPower > friendlyPower * OVERWHELMING_ODDS && retreat
        && context.enemyPowerAt(retreat.id) < friendlyPower) {
      team.npcDecision = { type: 'retreat', location: retreat.id };
      return moveOrder(retreat.direction);
    }
    // No queue means the regular combat fallback chooses attacks, spells and items.
    return null;
  }

  const continuing = continueDecision(params, npc, team, context);
  if (continuing) return continuing;
  const options = getNpcOptions(params, npc, team, context);
  const weight = (option: NpcOption) => Math.max(0.01, option.benefit / option.cost);
  let choice = Math.random() * options.reduce((total, option) => total + weight(option), 0);
  let selected = options[options.length - 1];
  for (const option of options) {
    choice -= weight(option);
    if (choice < 0) {
      selected = option;
      break;
    }
  }
  team.npcDecision = selected.decision;
  return selected.actions ?? continueDecision(params, npc, team, context) ?? { actions: [] };
}
