import { GameState } from "@/lib/store/types";
import { getState } from "./territory-state";
import { getMonsterStrength, monsters } from "@/lib/games/monsters";

const MONSTER_MIN_COST = 10;
const MONSTER_MAX_COST = 100;

export function getWarlordAvailableMonsters(gameState: GameState, playerId: string): string[] {
  const state = getState(gameState);

  const npcWarlords = gameState.npcs.filter(n => n.team === playerId);
  const teams = [
    playerId,
    ...npcWarlords.map(w => w.id),
  ];

  return teams.map(team => state.teams[team]?.monsters || [])
    .flat()
    .sort((a, b) => getMonsterStrength(monsters[a]) - getMonsterStrength(monsters[b]));
}

export function getMonsterCost(monster: string): number {
  const strength = getMonsterStrength(monsters[monster]);

  return MONSTER_MIN_COST + Math.floor(strength * (MONSTER_MAX_COST - MONSTER_MIN_COST));
}
