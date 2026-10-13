import { warlordsOfFire } from '@/lib/games/maps/warlords-of-fire';
import { monsters, mostersExcludeFromAutoPopulate } from '@/lib/games/monsters';
import { getCombatStats, getPlayerActionsCosts } from '@/lib/store/playerStats';
import { INamedTarget, NPCState, PlayerActionFastTravel, PlayerActionMove, PlayerActionRecruit, PlayerActionsState, PlayerActionType } from '@/lib/store/types';
import { BaseParams } from '../base-params';
import { getEnemies, getFriends } from '../game-friends-or-enemies';
import { getNpcActions } from '../game-npc-actions';
import { getMonsterCombatant } from '../monster-combatant';
import { playerMonsters } from './monsters';
import { getMonsterCost, getWarlordAvailableMonsters } from './recruit-helper';
import { NpcDecision, TeamStateDef } from './territory-state';

export const NPC_RUN_STEPS = 5;
const OVERWHELMING_ODDS = 1.8;
const MAX_RECRUITS = 3;

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

function enemiesAt(params: BaseParams, npc: NPCState, location: number): INamedTarget[] {
  return getEnemies(params, { ...npc, location: { id: location, description: '', move: [] } })
    .filter(enemy => enemy.health > 0);
}

function enemyPowerAt(params: BaseParams, npc: NPCState, location: number): number {
  return enemiesAt(params, npc, location).reduce((total, enemy) => total + combatPower(enemy), 0);
}

function blocked(params: BaseParams, location: number, direction: string): boolean {
  return params.blockedMoves.some(block => block.location === location && block.direction === direction);
}

/** Routes stay in owned territory, respect blocked edges and avoid live enemies. */
export function getNpcTerritoryRoutes(params: BaseParams, npc: NPCState, team: TeamStateDef): Map<number, number[]> {
  const routes = new Map<number, number[]>();
  if (enemiesAt(params, npc, npc.location.id).length > 0) return routes;
  const locations = new Map(warlordsOfFire.locations.map(location => [location.id, location]));
  const queue = [npc.location.id];
  routes.set(npc.location.id, []);
  for (let i = 0; i < queue.length; i++) {
    const location = locations.get(queue[i]);
    for (const move of location?.move ?? []) {
      if (routes.has(move.id) || !team.territory.includes(move.id)
          || blocked(params, queue[i], move.direction) || enemiesAt(params, npc, move.id).length > 0) continue;
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

function gatherParty(params: BaseParams, npc: NPCState, enemyPower: number): void {
  let force = combatPower(npc) + params.monsters
    .filter(monster => monster.masterId === npc.id && monster.location === npc.location.id && monster.health > 0)
    .reduce((total, monster) => total + combatPower(getMonsterCombatant(monster)), 0);
  const available = params.monsters.filter(monster => monster.team === npc.team && !monster.masterId
    && monster.location === npc.location.id && monster.health > 0)
    .sort((a, b) => combatPower(getMonsterCombatant(b)) - combatPower(getMonsterCombatant(a)));
  for (const monster of available) {
    if (force >= enemyPower * 1.4) break;
    monster.masterId = npc.id;
    force += combatPower(getMonsterCombatant(monster));
  }
}

function eligibleRecruits(params: BaseParams, npc: NPCState): string[] {
  return [...new Set(getWarlordAvailableMonsters(params.gameState, npc.id))]
    .filter(type => monsters[type] && !playerMonsters.includes(type) && !mostersExcludeFromAutoPopulate.includes(type));
}

function continueDecision(params: BaseParams, npc: NPCState, team: TeamStateDef): PlayerActionsState | undefined {
  const decision = team.npcDecision;
  if (!decision) return;
  const routes = getNpcTerritoryRoutes(params, npc, team);
  if (decision.type === 'retreat') {
    if (npc.location.id === decision.location) {
      releaseParty(params, npc);
    } else {
      const move = warlordsOfFire.locations.find(location => location.id === npc.location.id)?.move
        .find(move => move.id === decision.location && !blocked(params, npc.location.id, move.direction));
      if (move) return moveOrder(move.direction);
    }
  } else if (decision.type === 'expand') {
    if (npc.location.id !== decision.location
        && (!team.territory.includes(decision.location) || enemiesAt(params, npc, decision.location).length > 0)) {
      const route = routes.get(decision.from);
      const move = warlordsOfFire.locations.find(location => location.id === decision.from)?.move
        .find(move => move.id === decision.location && !blocked(params, decision.from, move.direction));
      if (route && move) {
        if (route.length > 0) return runOrder(route);
        const threat = enemyPowerAt(params, npc, decision.location);
        const force = combatPower(npc) + getFriends(params, npc).filter(friend => friend.health > 0)
          .reduce((total, friend) => total + combatPower(friend), 0);
        if (threat >= force * OVERWHELMING_ODDS) {
          delete team.npcDecision;
          return;
        }
        gatherParty(params, npc, threat);
        return moveOrder(move.direction);
      }
    }
  } else if (team.territory.includes(decision.location)) {
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

function reinforcementOptions(params: BaseParams, npc: NPCState, team: TeamStateDef, routes: Map<number, number[]>): NpcOption[] {
  const types = eligibleRecruits(params, npc).filter(type => getMonsterCost(type) <= team.coins);
  const options: NpcOption[] = [];
  for (const [location, route] of routes) {
    if (!team.territory.includes(location)) continue;
    const garrison = params.monsters.filter(monster => monster.team === npc.team && monster.location === location
      && monster.health > 0 && !monster.masterId)
      .reduce((total, monster) => total + combatPower(getMonsterCombatant(monster)), 0);
    const nearbyThreat = Math.max(0, ...(
      warlordsOfFire.locations.find(candidate => candidate.id === location)?.move ?? []
    ).map(move => enemyPowerAt(params, npc, move.id)));
    for (const type of types) {
      const unitPower = combatPower(getMonsterCombatant({
        id: 'recruit', type, health: monsters[type].baseStats.health, location, team: npc.team,
      }));
      const deficit = Math.max(unitPower, nearbyThreat * 0.75) - garrison;
      if (deficit <= 0) continue;
      const count = Math.min(MAX_RECRUITS, Math.ceil(deficit / Math.max(1, unitPower)), Math.floor(team.coins / getMonsterCost(type)));
      options.push({
        decision: { type: 'reinforce', location, recruits: Array.from({ length: count }, () => type) },
        cost: 1 + Math.ceil(route.length / NPC_RUN_STEPS) + count * getMonsterCost(type) / Math.max(20, team.coins),
        benefit: 12 * Math.min(deficit, count * unitPower) / Math.max(1, unitPower) + nearbyThreat / Math.max(1, unitPower),
      });
    }
  }
  return options;
}

/** Benefits use income/defence/recovery value; costs include travel, coins and combat risk. */
export function getNpcOptions(params: BaseParams, npc: NPCState, team: TeamStateDef): NpcOption[] {
  const routes = getNpcTerritoryRoutes(params, npc, team);
  const options: NpcOption[] = [];
  const expansionBias = 1 + 3 * Math.exp(-params.gameState.turn / 20);
  for (const [from, route] of routes) {
    const localForce = combatPower(npc) + params.monsters
      .filter(monster => monster.location === from && monster.team === npc.team && monster.health > 0
        && (!monster.masterId || monster.masterId === npc.id))
      .reduce((total, monster) => total + combatPower(getMonsterCombatant(monster)), 0);
    for (const move of warlordsOfFire.locations.find(location => location.id === from)?.move ?? []) {
      const threat = enemyPowerAt(params, npc, move.id);
      const owned = team.territory.includes(move.id);
      if ((owned && threat === 0) || blocked(params, from, move.direction)) continue;
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
  options.push(...reinforcementOptions(params, npc, team, routes));
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
  const enemies = enemiesAt(params, npc, npc.location.id);
  if (enemies.length > 0) {
    const friendlyPower = combatPower(npc) + getFriends(params, npc).filter(friend => friend.health > 0)
      .reduce((total, friend) => total + combatPower(friend), 0);
    const enemyPower = enemies.reduce((total, enemy) => total + combatPower(enemy), 0);
    const previous = team.npcDecision?.type === 'expand' && team.npcDecision.location === npc.location.id
      ? team.npcDecision.from : undefined;
    const retreat = warlordsOfFire.locations.find(location => location.id === npc.location.id)?.move
      .find(move => (previous !== undefined ? move.id === previous : move.direction === npc.retreatDirection)
        && !blocked(params, npc.location.id, move.direction));
    if (enemyPower > friendlyPower * OVERWHELMING_ODDS && retreat
        && enemyPowerAt(params, npc, retreat.id) < friendlyPower) {
      team.npcDecision = { type: 'retreat', location: retreat.id };
      return moveOrder(retreat.direction);
    }
    // No queue means the regular combat fallback chooses attacks, spells and items.
    return null;
  }

  const continuing = continueDecision(params, npc, team);
  if (continuing) return continuing;
  const options = getNpcOptions(params, npc, team);
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
  return selected.actions ?? continueDecision(params, npc, team) ?? { actions: [] };
}
