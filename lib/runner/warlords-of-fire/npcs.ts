import { getCellCoordinates, MAP_COLUMNS, MAP_ROWS } from "@/lib/games/gridCells";
import { warlordsOfFire } from "@/lib/games/maps/warlords-of-fire";
import { getMonsterStrength, monsters, mostersExcludeFromAutoPopulate } from "@/lib/games/monsters";
import { NPC_DATA, NPC_NAMES } from "@/lib/games/npc-details";
import { Location } from "@/lib/games/types";
import { getNamedTargetStats } from "@/lib/store/playerStats";
import { PlayerActionsState } from "@/lib/store/types";
import { commitNpcPlansInRedis, getGameStateFromRedis, getLocationsStateFromRedis, lockGameStateInRedis, lockLocationsStateInRedis, processingLockTTL } from "@/lib/store/redis-access";
import { BaseParams } from "../base-params";
import { getPlayerLocation } from "../game-location";
import { getNpcEquipment, getNpcSpells, getNpcStats } from "../shared-processes/npcs";
import { ProcessRunner } from "../types";
import { START_LOCATIONS } from "./game-creation";
import { playerMonsters } from "./monsters";
import { DEFAULT_TEAM_STATE, getState, saveState } from "./territory-state";
import { planNpcTurn } from "./npc-strategy";

const NPC_COUNT = 16;
const REGIONS_PER_AXIS = 4;
const MIN_START_DISTANCE = 3;
const INITIAL_COINS = 100;

// Bright, separated hues and shades, avoiding the player and shop LED colours.
const NPC_COLOURS = [
  'FF0000', '00FFFF', '00FF00', '0040FF',
  'FFFF00', 'FFFFFF', 'FF00FF', '40C0FF',
  'FF0080', 'FFC040', 'FFC0FF', '80FF80',
  'C080FF', 'C0FFC0', 'FF8040', '00C080',
];

function shuffle<T>(values: T[]): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getStartDistances(): Map<number, number> {
  const locations = new Map(warlordsOfFire.locations.map(location => [location.id, location]));
  const distances = new Map(START_LOCATIONS.map(id => [id, 0]));
  const queue = [...START_LOCATIONS];

  // The map has winding paths: measure the shortest route from any player start.
  for (let i = 0; i < queue.length; i++) {
    const location = locations.get(queue[i])!;
    for (const move of location.move) {
      if (!distances.has(move.id)) {
        distances.set(move.id, distances.get(location.id)! + 1);
        queue.push(move.id);
      }
    }
  }
  return distances;
}

function getNpcLocations(params: BaseParams, distances: Map<number, number>): Location[] {
  const regions: Location[][] = Array.from({ length: NPC_COUNT }, () => []);
  const starts = START_LOCATIONS.map(getCellCoordinates);
  for (const location of warlordsOfFire.locations) {
    const { row, col } = getCellCoordinates(location.id);
    if (!distances.has(location.id) || distances.get(location.id)! < MIN_START_DISTANCE
        || starts.some(start => Math.max(Math.abs(row - start.row), Math.abs(col - start.col)) < MIN_START_DISTANCE)
        || params.gameState.stores.includes(location.id)
        || params.gameState.players.some(player => player.location.id === location.id)
        || params.gameState.npcs.some(npc => npc.location.id === location.id)) {
      continue;
    }

    const regionRow = Math.floor(row / (MAP_ROWS / REGIONS_PER_AXIS));
    const regionCol = Math.floor(col / (MAP_COLUMNS / REGIONS_PER_AXIS));
    regions[regionRow * REGIONS_PER_AXIS + regionCol].push(location);
  }

  // Pick one random location in each region to keep the warlords spread out.
  return regions.map((locations, region) => {
    if (locations.length === 0) {
      throw new Error(`No safe starting location for a warlord in region ${region}`);
    }
    return locations[Math.floor(Math.random() * locations.length)];
  }).sort((a, b) => distances.get(a.id)! - distances.get(b.id)!);
}

export const npcProcesses: ProcessRunner = {
  setup: async (params) => {
    const distances = getStartDistances();
    const locations = getNpcLocations(params, distances);
    const npcDefs = shuffle(NPC_DATA.filter(npc => npc.iconXY.x >= 0 && npc.iconXY.x <= 3
      && npc.iconXY.y >= 1 && npc.iconXY.y <= 4));
    const colours = shuffle(NPC_COLOURS);
    const excludedMonsters = [...playerMonsters, ...mostersExcludeFromAutoPopulate];
    const availableMonsters = Object.values(monsters).filter(monster => !excludedMonsters.includes(monster.id));
    if (availableMonsters.length === 0) {
      throw new Error('No monsters available for NPC warlords');
    }

    const npcMonsters = shuffle(availableMonsters).slice(0, NPC_COUNT);
    // Use each eligible type before repeating any, reshuffling each pass.
    while (npcMonsters.length < NPC_COUNT) {
      npcMonsters.push(...shuffle(availableMonsters).slice(0, NPC_COUNT - npcMonsters.length));
    }
    npcMonsters.sort((a, b) => getMonsterStrength(a) - getMonsterStrength(b));
    const state = getState(params.gameState);

    for (const [index, npcDef] of npcDefs.entries()) {
      const npcId = `warlord-${index + 1}`;
      const names = NPC_NAMES.filter(name => name.type === npcDef.type && name.race === npcDef.race
        && name.gender === npcDef.gender && !params.gameState.npcs.some(npc => npc.name === name.name));
      const name = names[Math.floor(Math.random() * names.length)].name;
      const cost = 80 + Math.floor(Math.random() * 81);
      const baseStats = getNpcStats[npcDef.type](cost);
      const equipment = getNpcEquipment(npcId, npcDef.type);
      const equipped = { weapon: equipment[0].id };
      const stats = getNamedTargetStats(baseStats, { equipment, equipped });
      const location = locations[index];

      params.gameState.npcs.push({
        id: npcId,
        characterType: npcDef.type,
        masterId: null,
        name,
        location: getPlayerLocation(params, location),
        magic: stats.magic,
        spells: getNpcSpells(npcDef.type),
        equipment,
        equipped,
        baseStats,
        hireCost: cost,
        iconXY: { ...npcDef.iconXY },
        health: stats.health,
        team: npcId,
        scriptedActions: true,
      });

      state.teams[npcId] = {
        ...DEFAULT_TEAM_STATE,
        territory: [location.id],
        colour: colours[index],
        coins: INITIAL_COINS,
        monsters: [npcMonsters[index].id],
      };
    }
    saveState(params.gameState, state);
  },

  executeBetweenTurns: async (params) => {
    // Between-turn params have no location state. Read a fresh snapshot under the
    // same locks as inventory changes, then save plans, parties and queues atomically.
    const releaseGame = await lockGameStateInRedis(params.boardId, params.mapId, processingLockTTL);
    let releaseLocations: (() => Promise<void>) | undefined;
    try {
      releaseLocations = await lockLocationsStateInRedis(params.boardId, params.mapId);
      const [gameState, locations] = await Promise.all([
        getGameStateFromRedis(params.boardId, params.mapId),
        getLocationsStateFromRedis(params.boardId, params.mapId),
      ]);
      if (!gameState || gameState.gameId !== warlordsOfFire.id) return;
      const turnParams: BaseParams = { ...params, ...locations, gameState };
      const state = getState(gameState);
      const orders: Record<string, PlayerActionsState | null> = {};
      for (const npc of gameState.npcs.filter(npc => npc.scriptedActions)) {
        const team = state.teams[npc.id];
        const pendingHire = locations.npcs.find(candidate => candidate.id === npc.id)?.masterId;
        if (!team || npc.health <= 0 || npc.masterId || pendingHire || npc.team !== npc.id) {
          orders[npc.id] = null;
          if (team) delete team.npcDecision;
          for (const monster of locations.monsters.filter(monster => monster.masterId === npc.id)) {
            delete monster.masterId;
          }
          continue;
        }
        orders[npc.id] = planNpcTurn(turnParams, npc, team);
      }
      saveState(gameState, state);
      await commitNpcPlansInRedis(params.boardId, params.mapId, gameState, locations, orders);
      Object.assign(params, turnParams);
    } finally {
      try {
        if (releaseLocations) await releaseLocations();
      } finally {
        await releaseGame();
      }
    }
  }
}
