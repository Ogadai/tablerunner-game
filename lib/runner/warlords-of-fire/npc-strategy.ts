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
const EXPANSION_ADVANTAGE = 1.4;
const DEFENCE_ADVANTAGE = 1.2;
const MAX_RECRUITS = 3;
const locationsById = new Map(warlordsOfFire.locations.map(location => [location.id, location]));

interface NpcOption {
  decision?: NpcDecision;
  actions?: PlayerActionsState;
  cost: number;
  benefit: number;
  priority?: number;
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
  reservedLocations: Set<number>;
  routes?: Map<number, number[]>;
}

/** One commander's planning snapshot; party membership is still read from live monsters. */
function createPlanningContext(params: BaseParams, npc: NPCState, team: TeamStateDef,
  reservedLocations = new Set<number>()): NpcPlanningContext {
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
    reservedLocations,
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

function nearbyThreat(location: number, context: NpcPlanningContext, destination?: number): number {
  return Math.max(0, ...(locationsById.get(location)?.move ?? []).map(move => {
    if (move.id === destination) return 0;
    const incoming = locationsById.get(move.id)?.move.find(incoming => incoming.id === location);
    return incoming && !context.blocked(move.id, incoming.direction) ? context.enemyPowerAt(move.id) : 0;
  }));
}

function garrisonPower(npc: NPCState, location: number, context: NpcPlanningContext): number {
  return context.monstersAt(location).filter(monster => monster.team === npc.team && !monster.masterId)
    .reduce((total, monster) => total + context.monsterPower(monster), 0);
}

function partyPower(npc: NPCState, context: NpcPlanningContext): number {
  return context.monstersAt(npc.location.id).filter(monster => monster.team === npc.team && monster.masterId === npc.id)
    .reduce((total, monster) => total + context.monsterPower(monster), 0);
}

/** Keep a garrison for enemies other than the intended invasion target. */
function availableParty(npc: NPCState, location: number, context: NpcPlanningContext, destination?: number): MonsterState[] {
  let garrison = garrisonPower(npc, location, context);
  const reserve = nearbyThreat(location, context, destination) * DEFENCE_ADVANTAGE;
  return context.monstersAt(location).filter(monster => monster.team === npc.team && !monster.masterId)
    .sort((a, b) => context.monsterPower(b) - context.monsterPower(a))
    .filter(monster => {
      const power = context.monsterPower(monster);
      if (garrison - power < reserve) return false;
      garrison -= power;
      return true;
    });
}

function expansionForce(npc: NPCState, from: number, destination: number, context: NpcPlanningContext): number {
  const sources = from === npc.location.id ? [from] : [npc.location.id, from];
  return combatPower(npc) + partyPower(npc, context) + sources.reduce((total, location) => total
    + availableParty(npc, location, context, destination).reduce((power, monster) => power + context.monsterPower(monster), 0), 0);
}

function canCounterAttack(npc: NPCState, context: NpcPlanningContext): boolean {
  return (locationsById.get(npc.location.id)?.move ?? []).some(move => {
    const threat = context.enemyPowerAt(move.id);
    return threat > 0 && !context.blocked(npc.location.id, move.direction) && !context.reservedLocations.has(move.id)
      && expansionForce(npc, npc.location.id, move.id, context) >= threat * EXPANSION_ADVANTAGE;
  });
}

function gatherParty(npc: NPCState, enemyPower: number, context: NpcPlanningContext, destination?: number,
  minimumPartyPower = combatPower(npc) * 0.5): void {
  const npcPower = combatPower(npc);
  let force = npcPower + partyPower(npc, context);
  for (const monster of availableParty(npc, npc.location.id, context, destination)) {
    if (force >= Math.max(npcPower + minimumPartyPower, enemyPower * EXPANSION_ADVANTAGE)) break;
    monster.masterId = npc.id;
    force += context.monsterPower(monster);
  }
}

function eligibleRecruits(params: BaseParams, npc: NPCState): string[] {
  return [...new Set(getWarlordAvailableMonsters(params.gameState, npc.team ?? npc.id))]
    .filter(type => monsters[type] && !playerMonsters.includes(type) && !mostersExcludeFromAutoPopulate.includes(type));
}

function recruitPower(type: string): number {
  return combatPower(getMonsterCombatant({
    id: 'recruit', type, health: monsters[type].baseStats.health, location: 0, team: null,
  }));
}

function getRecruitTypes(params: BaseParams, npc: NPCState, team: TeamStateDef) {
  return eligibleRecruits(params, npc).map(type => ({
    type, cost: getMonsterCost(type), power: recruitPower(type),
  })).filter(type => type.cost <= team.coins);
}

function recruitOrder(recruits: string[]): PlayerActionsState {
  const action: PlayerActionRecruit = {
    id: 1, type: PlayerActionType.Recruit, monsters: recruits, description: `Recruit ${recruits.length} monsters`,
  };
  return { actions: [action] };
}

function affordableRecruits(params: BaseParams, npc: NPCState, team: TeamStateDef, recruits: string[]): string[] {
  const eligible = eligibleRecruits(params, npc);
  let coins = team.coins;
  return recruits.filter(type => {
    if (!eligible.includes(type) || getMonsterCost(type) > coins) return false;
    coins -= getMonsterCost(type);
    return true;
  });
}

function continueDecision(params: BaseParams, npc: NPCState, team: TeamStateDef, context: NpcPlanningContext): PlayerActionsState | undefined {
  const decision = team.npcDecision;
  if (!decision) return;
  if (decision.type !== 'retreat' && context.reservedLocations.has(decision.location)) {
    delete team.npcDecision;
    return;
  }
  const routes = getNpcTerritoryRoutes(params, npc, team, context);
  if (decision.type === 'retreat') {
    if (npc.location.id === decision.location) {
      releaseParty(params, npc);
    } else {
      const move = locationsById.get(npc.location.id)?.move
        .find(move => move.id === decision.location && !context.blocked(npc.location.id, move.direction));
      if (move) return moveOrder(move.direction);
    }
  } else if (decision.type === 'expand' || decision.type === 'prepare') {
    if (npc.location.id !== decision.location
        && (!context.territory.has(decision.location) || context.enemiesAt(decision.location).length > 0)) {
      const route = routes.get(decision.from);
      const move = locationsById.get(decision.from)?.move
        .find(move => move.id === decision.location && !context.blocked(decision.from, move.direction));
      if (route && move) {
        const threat = context.enemyPowerAt(decision.location);
        const force = expansionForce(npc, decision.from, decision.location, context);
        const firstRecruit = decision.type === 'prepare' ? decision.recruits[0] : undefined;
        let deficit = Math.max(threat * EXPANSION_ADVANTAGE, combatPower(npc)
          + (firstRecruit && monsters[firstRecruit] ? recruitPower(firstRecruit) : 0)) - force;
        if (decision.type === 'prepare' && deficit <= 0) {
          team.npcDecision = { type: 'expand', from: decision.from, location: decision.location };
          return continueDecision(params, npc, team, context);
        }
        const recruits = decision.type === 'prepare' ? affordableRecruits(params, npc, team, decision.recruits).filter(type => {
          if (deficit <= 0) return false;
          deficit -= recruitPower(type);
          return true;
        }) : [];
        if ((decision.type === 'expand' && force < threat * EXPANSION_ADVANTAGE)
            || (decision.type === 'prepare' && (!context.territory.has(decision.from) || recruits.length === 0))) {
          delete team.npcDecision;
          return;
        }
        gatherParty(npc, threat, context, decision.location);
        if (route.length > 0) return runOrder(route);
        if (decision.type === 'prepare') return recruitOrder(recruits);
        return moveOrder(move.direction);
      }
    }
  } else if (context.territory.has(decision.location)) {
    if (nearbyThreat(decision.location, context) * DEFENCE_ADVANTAGE <= garrisonPower(npc, decision.location, context)) {
      delete team.npcDecision;
      return;
    }
    const route = routes.get(decision.location);
    if (route?.length) {
      const deficit = nearbyThreat(decision.location, context) * DEFENCE_ADVANTAGE - garrisonPower(npc, decision.location, context);
      gatherParty(npc, 0, context, undefined, Math.max(0, deficit));
      return runOrder(route);
    }
    if (route) {
      releaseParty(params, npc);
      const deficit = nearbyThreat(decision.location, context) * DEFENCE_ADVANTAGE - garrisonPower(npc, decision.location, context);
      if (decision.type === 'defend' && deficit > 0 && combatPower(npc) >= deficit
          && !canCounterAttack(npc, context)
          && !eligibleRecruits(params, npc).some(type => getMonsterCost(type) <= team.coins)) {
        return getNpcActions(params, npc);
      }
      if (decision.type === 'reinforce') {
        let remainingDeficit = deficit;
        const recruits = affordableRecruits(params, npc, team, decision.recruits).filter(type => {
          if (remainingDeficit <= 0) return false;
          remainingDeficit -= recruitPower(type);
          return true;
        });
        if (recruits.length > 0) return recruitOrder(recruits);
      }
    }
  }
  // Completed, lost, unaffordable or blocked goals can be replaced.
  delete team.npcDecision;
}

function reinforcementOptions(params: BaseParams, npc: NPCState, team: TeamStateDef, routes: Map<number, number[]>, context: NpcPlanningContext): NpcOption[] {
  const types = getRecruitTypes(params, npc, team);
  const options: NpcOption[] = [];
  for (const [location, route] of routes) {
    if (!context.territory.has(location) || context.reservedLocations.has(location)) continue;
    const threat = nearbyThreat(location, context);
    const deficit = threat * DEFENCE_ADVANTAGE - garrisonPower(npc, location, context);
    if (deficit <= 0) continue;
    const mobilePower = partyPower(npc, context) + availableParty(npc, npc.location.id, context)
      .reduce((total, monster) => total + context.monsterPower(monster), 0);
    const defencePower = combatPower(npc) + mobilePower;
    if (defencePower >= deficit && (route.length > 0 || partyPower(npc, context) > 0
        || (types.length === 0 && !canCounterAttack(npc, context)))) {
      options.push({
        decision: { type: 'defend', location },
        cost: 1 + Math.ceil(route.length / NPC_RUN_STEPS),
        benefit: 24, priority: 1,
      });
    }
    for (const { type, cost, power: unitPower } of types) {
      const count = Math.min(MAX_RECRUITS, Math.ceil(deficit / Math.max(1, unitPower)), Math.floor(team.coins / cost));
      options.push({
        decision: { type: 'reinforce', location, recruits: Array.from({ length: count }, () => type) },
        cost: 1 + Math.ceil(route.length / NPC_RUN_STEPS) + count * cost / Math.max(20, team.coins),
        benefit: 12 * Math.min(deficit, count * unitPower) / Math.max(1, unitPower) + threat / Math.max(1, unitPower),
        priority: 1,
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
  const recruitTypes = getRecruitTypes(params, npc, team);
  for (const [from, route] of routes) {
    for (const move of locationsById.get(from)?.move ?? []) {
      const threat = context.enemyPowerAt(move.id);
      const owned = context.territory.has(move.id);
      if ((owned && threat === 0) || context.blocked(from, move.direction) || context.reservedLocations.has(move.id)) continue;
      const localForce = expansionForce(npc, from, move.id, context);
      const odds = threat / Math.max(1, localForce);
      if (localForce >= threat * EXPANSION_ADVANTAGE) {
        options.push({
          decision: { type: 'expand', from, location: move.id },
          cost: 1 + Math.ceil(route.length / NPC_RUN_STEPS) + odds * 2,
          benefit: (owned ? 30 : 10 * expansionBias) / (1 + odds * odds),
          priority: owned || threat > 0 ? 1 : 0,
        });
      }
      if (!context.territory.has(from)) continue;
      for (const { type, cost, power } of recruitTypes) {
        const deficit = Math.max(npcPower + power, threat * EXPANSION_ADVANTAGE) - localForce;
        if (deficit <= 0) continue;
        const count = Math.min(MAX_RECRUITS, Math.ceil(deficit / Math.max(1, power)), Math.floor(team.coins / cost));
        const preparedOdds = threat / Math.max(1, localForce + count * power);
        if (preparedOdds >= OVERWHELMING_ODDS) continue;
        options.push({
          decision: { type: 'prepare', from, location: move.id, recruits: Array.from({ length: count }, () => type) },
          cost: 2 + Math.ceil(route.length / NPC_RUN_STEPS) + count * cost / Math.max(20, team.coins) + preparedOdds * 2,
          benefit: (owned ? 30 : 10 * expansionBias) / (1 + preparedOdds * preparedOdds),
          priority: owned || threat > 0 ? 1 : 0,
        });
      }
    }
  }
  options.push(...reinforcementOptions(params, npc, team, routes, context));
  const stats = getCombatStats(npc);
  const recovery = getNpcActions(params, npc);
  options.push({
    actions: recovery,
    cost: 1 + getPlayerActionsCosts(npc, recovery) / 20,
    benefit: 1 + 20 * (1 - npc.health / Math.max(1, stats.health))
      + (stats.magic > 0 ? 5 * (1 - npc.magic / stats.magic) : 0) + (recovery.actions.length > 0 ? 3 : 0),
    priority: npc.health < stats.health * 0.35 ? 2 : 0,
  });
  return options;
}

export function planNpcTurn(params: BaseParams, npc: NPCState, team: TeamStateDef,
  reservedLocations = new Set<number>()): PlayerActionsState | null {
  const context = createPlanningContext(params, npc, team, reservedLocations);
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

  // Captured and badly wounded commanders recover before resuming strategic travel.
  if (npc.health < getCombatStats(npc).health * 0.35) return getNpcActions(params, npc);
  const continuing = continueDecision(params, npc, team, context);
  if (continuing) return continuing;
  const candidates = getNpcOptions(params, npc, team, context);
  const priority = Math.max(...candidates.map(option => option.priority ?? 0));
  const options = candidates.filter(option => (option.priority ?? 0) === priority);
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
