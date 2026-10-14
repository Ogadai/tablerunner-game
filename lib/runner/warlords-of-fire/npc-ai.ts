import { google } from '@ai-sdk/google';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { warlordsOfFire } from '@/lib/games/maps/warlords-of-fire';
import { getCombatStats } from '@/lib/store/playerStats';
import {
  PlayerActionsState,
  PlayerActionFastTravel,
  PlayerActionMove,
  PlayerActionRecruit,
  PlayerActionType,
} from '@/lib/store/types';
import { getWarlordAvailableMonsters, getMonsterCost } from './recruit-helper';
import { getNpcTerritoryRoutes, NPC_RUN_STEPS } from './npc-strategy';
import { getMonsterCombatant } from '../monster-combatant';
import { getEnemies } from '../game-friends-or-enemies';
import { BaseParams } from '../base-params';
import { monsters, mostersExcludeFromAutoPopulate } from '@/lib/games/monsters';
import { playerMonsters } from './monsters';
import { getState } from './territory-state';

const directions = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const;

const npcActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('move'), direction: z.enum(directions) }),
  z.object({ type: z.literal('fastTravel'), targetLocation: z.number().int() }),
  z.object({ type: z.literal('recruit'), monsters: z.array(z.string()).min(1).max(3) }),
]);

const npcOrdersSchema = z.object({
  orders: z.array(z.object({
    npcId: z.string(),
    action: npcActionSchema.nullable(),
  })),
});

type NpcAction = z.infer<typeof npcActionSchema>;
export type NpcAiOrders = Map<string, NpcAction | null>;

function canIssueOrder(params: BaseParams, npcId: string): boolean {
  const npc = params.gameState.npcs.find(candidate => candidate.id === npcId);
  const state = getState(params.gameState);
  const pendingHire = params.npcs.find(candidate => candidate.id === npcId)?.masterId;
  return !!npc && !!npc.team && !!state.teams[npc.id] && !!state.teams[npc.team]
    && npc.health > 0 && !npc.masterId && !pendingHire
    && !getEnemies(params, npc).some(enemy => enemy.health > 0);
}

function createAiContext(params: BaseParams) {
  const state = getState(params.gameState);
  const blocked = new Set(params.blockedMoves.map(move => `${move.location}:${move.direction}`));
  const factions = Object.entries(state.teams).map(([id, team]) => ({
    id,
    territory: team.territory,
    coins: team.coins,
    availableMonsterTypes: team.monsters,
  }));
  const worldWarlords = [...params.gameState.players, ...params.gameState.npcs]
    .filter(warlord => warlord.health > 0)
    .map(warlord => ({
      id: warlord.id,
      name: warlord.name,
      team: warlord.team,
      location: warlord.location.id,
      health: warlord.health,
      stats: warlord.baseStats ? getCombatStats(warlord) : undefined,
    }));
  const worldMonsters = params.monsters.filter(monster => monster.health > 0).map(monster => ({
    id: monster.id,
    type: monster.type,
    team: monster.team,
    location: monster.location,
    masterId: monster.masterId,
    health: monster.health,
    stats: getCombatStats(getMonsterCombatant(monster)),
  }));
  const npcs = params.gameState.npcs.filter(npc => npc.scriptedActions).map(npc => {
    const faction = npc.team ? state.teams[npc.team] : undefined;
    const command = state.teams[npc.id];
    const fighting = getEnemies(params, npc).some(enemy => enemy.health > 0);
    const recruits = npc.team
      ? [...new Set(getWarlordAvailableMonsters(params.gameState, npc.team))]
        .filter(type => monsters[type] && !playerMonsters.includes(type)
          && !mostersExcludeFromAutoPopulate.includes(type))
        .map(type => ({ type, cost: getMonsterCost(type), stats: monsters[type].baseStats }))
      : [];
    const location = warlordsOfFire.locations.find(candidate => candidate.id === npc.location.id);
    const availableMoves = !fighting ? (location?.move ?? [])
      .filter(move => !blocked.has(`${npc.location.id}:${move.direction}`)) : [];
    const routes = faction && !fighting ? getNpcTerritoryRoutes(params, npc, faction) : new Map();
    const fastTravelTargets = [...routes.entries()]
      .filter(([, route]) => route.length > 0 && route.length <= NPC_RUN_STEPS)
      .map(([targetLocation]) => targetLocation);
    const teamMonsters = params.monsters.filter(monster => monster.team === npc.team);

    return {
      id: npc.id,
      name: npc.name,
      team: npc.team,
      location: npc.location.id,
      health: npc.health,
      magic: npc.magic,
      stats: getCombatStats(npc),
      eligibleToAct: canIssueOrder(params, npc.id),
      fighting,
      strategicGoal: command?.npcDecision,
      territory: faction?.territory ?? [],
      teamCoins: faction?.coins ?? 0,
      availableMoves,
      fastTravelTargets,
      recruits,
      teamMonsters: teamMonsters.map(monster => ({
        id: monster.id,
        type: monster.type,
        location: monster.location,
        health: monster.health,
        masterId: monster.masterId,
        stats: getCombatStats(getMonsterCombatant(monster)),
      })),
    };
  });

  return { turn: params.gameState.turn, factions, warlords: npcs, worldWarlords, worldMonsters };
}

export async function requestWarlordAiOrders(params: BaseParams): Promise<NpcAiOrders> {
  const npcIds = params.gameState.npcs.filter(npc => npc.scriptedActions).map(npc => npc.id);
  if (npcIds.length === 0) return new Map();
  if (!npcIds.some(npcId => canIssueOrder(params, npcId))) {
    return new Map(npcIds.map(npcId => [npcId, null]));
  }

  const modelName = process.env.GOOGLE_GENERATIVE_AI_MODEL || 'gemini-3.1-flash-lite';
  const { output } = await generateText({
    model: google(modelName),
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(5000),
    providerOptions: {
      google: {
        serviceTier: 'priority',
        thinkingLevel: 'minimal',
      },
    },
    system: `You control all NPC warlords in a turn-based territory game. Choose at most one order for each warlord.
Return exactly one entry for every supplied NPC id. Use action null to wait or when the NPC is in battle, defeated,
hired, or otherwise ineligible. Never issue combat actions: the normal battle system handles combat.
Only choose moves, fast travel targets, and recruit types listed as available for that NPC. Prefer actions that
expand useful territory, reinforce threatened holdings, preserve coins when appropriate, and avoid hopeless fights.`,
    prompt: JSON.stringify(createAiContext(params)),
    output: Output.object({ schema: npcOrdersSchema }),
  });

  const expectedIds = new Set(npcIds);
  const orders: NpcAiOrders = new Map();
  for (const order of output.orders) {
    if (!expectedIds.has(order.npcId) || orders.has(order.npcId)) {
      throw new Error(`Invalid or duplicate Warlords AI order for ${order.npcId}`);
    }
    orders.set(order.npcId, order.action);
  }
  if (orders.size !== expectedIds.size) {
    throw new Error('Warlords AI response did not include an order for every NPC warlord');
  }
  return orders;
}

export function validateWarlordAiOrders(params: BaseParams, proposed: NpcAiOrders): Record<string, PlayerActionsState | null> {
  const validated: Record<string, PlayerActionsState | null> = {};
  const state = getState(params.gameState);
  for (const npc of params.gameState.npcs.filter(candidate => candidate.scriptedActions)) {
    const proposal = proposed.get(npc.id);
    if (!proposal || !canIssueOrder(params, npc.id) || !npc.team) {
      validated[npc.id] = null;
      continue;
    }

    let action: PlayerActionMove | PlayerActionFastTravel | PlayerActionRecruit | undefined;
    if (proposal.type === 'move') {
      const move = warlordsOfFire.locations.find(location => location.id === npc.location.id)?.move
        .find(candidate => candidate.direction === proposal.direction);
      if (move && !params.blockedMoves.some(block => block.location === npc.location.id
          && block.direction === move.direction)) {
        action = {
          id: 1,
          type: PlayerActionType.Move,
          direction: move.direction,
          description: `Move ${move.direction}`,
        };
      }
    } else if (proposal.type === 'fastTravel') {
      const faction = state.teams[npc.team];
      const route = faction && getNpcTerritoryRoutes(params, npc, faction).get(proposal.targetLocation);
      if (route?.length && route.length <= NPC_RUN_STEPS) {
        action = {
          id: 1,
          type: PlayerActionType.FastTravel,
          targetLocation: proposal.targetLocation,
          description: `Run to location ${proposal.targetLocation}`,
        };
      }
    } else {
      const faction = state.teams[npc.team];
      if (faction?.territory.includes(npc.location.id)) {
        const available = new Set(getWarlordAvailableMonsters(params.gameState, npc.team)
          .filter(type => monsters[type] && !playerMonsters.includes(type)
            && !mostersExcludeFromAutoPopulate.includes(type)));
        let coins = faction.coins;
        const recruits = proposal.monsters.filter(type => {
          if (!available.has(type)) return false;
          const cost = getMonsterCost(type);
          if (cost > coins) return false;
          coins -= cost;
          return true;
        });
        if (recruits.length > 0) {
          action = {
            id: 1,
            type: PlayerActionType.Recruit,
            monsters: recruits,
            description: `Recruit ${recruits.length} monsters`,
          };
        }
      }
    }
    validated[npc.id] = action ? { actions: [action] } : null;
  }
  return validated;
}
