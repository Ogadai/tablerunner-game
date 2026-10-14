import { warlordsOfFire } from '@/lib/games/maps/warlords-of-fire';
import { generateMonster } from '@/lib/games/monster-pack';
import { monsters, mostersExcludeFromAutoPopulate } from '@/lib/games/monsters';
import { NPCState, PlayerActionFastTravel, PlayerActionMove, PlayerActionRecruit, PlayerActionType } from '@/lib/store/types';
import { BaseParams } from '../base-params';
import { getEnemies } from '../game-friends-or-enemies';
import { getPlayerLocation } from '../game-location';
import { playerMessageAtLocation } from '../game-messages';
import { playerMonsters } from './monsters';
import { getNpcTerritoryRoutes, NPC_RUN_STEPS } from './npc-strategy';
import { getMonsterCost, getWarlordAvailableMonsters } from './recruit-helper';
import { getState, saveState } from './territory-state';

export function actionNpcTravel(params: BaseParams, npc: NPCState, action: PlayerActionMove | PlayerActionFastTravel): void {
  if (npc.health <= 0 || npc.masterId || !npc.team) return;
  const current = warlordsOfFire.locations.find(location => location.id === npc.location.id);
  const fighting = getEnemies(params, npc).some(enemy => enemy.health > 0);
  let destination: number | undefined;
  if (action.type === PlayerActionType.Move) {
    if (fighting && action.direction !== npc.retreatDirection) return;
    const move = current?.move.find(move => move.direction === action.direction);
    if (!move || params.blockedMoves.some(block => block.location === npc.location.id && block.direction === action.direction)) return;
    destination = move.id;
  } else {
    if (fighting) return;
    const team = getState(params.gameState).teams[npc.team];
    if (!team?.territory.includes(action.targetLocation)) return;
    const route = getNpcTerritoryRoutes(params, npc, team).get(action.targetLocation);
    if (!route?.length || route.length > NPC_RUN_STEPS) return;
    destination = action.targetLocation;
  }
  const location = warlordsOfFire.locations.find(location => location.id === destination);
  if (!location) return;
  npc.retreatDirection = action.type === PlayerActionType.Move
    ? location.move.find(move => move.id === npc.location.id)?.direction : undefined;
  playerMessageAtLocation(params, npc.id, `**{player}** moved to location ${location.id}`);
  npc.location = getPlayerLocation(params, location);
}

export function actionNpcRecruit(params: BaseParams, npc: NPCState, action: PlayerActionRecruit): void {
  const state = getState(params.gameState);
  const team = npc.team ? state.teams[npc.team] : undefined;
  if (!team || npc.health <= 0 || npc.masterId || !team.territory.includes(npc.location.id)
      || getEnemies(params, npc).some(enemy => enemy.health > 0)) return;
  const eligible = getWarlordAvailableMonsters(params.gameState, npc.team!);
  for (const type of action.monsters) {
    if (!eligible.includes(type) || !monsters[type] || playerMonsters.includes(type)
        || mostersExcludeFromAutoPopulate.includes(type)) continue;
    const cost = getMonsterCost(type);
    if (cost > team.coins) break;
    params.monsters.push(generateMonster(params.gameState, {
      type, location: npc.location.id, team: npc.team, health: monsters[type].baseStats.health,
      scriptedActions: true,
    }));
    team.coins -= cost;
  }
  // Recruitment is a single batch; future defence needs are evaluated afresh.
  const command = state.teams[npc.id];
  if (command?.npcDecision?.type === 'reinforce' && command.npcDecision.location === npc.location.id) {
    delete command.npcDecision;
  }
  saveState(params.gameState, state);
}
