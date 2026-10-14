import { getDisplayName, LedState, NPCState, PlayerState } from "@/lib/store/types";
import { publishPlayVideo } from "@/lib/messages/message-videos";
import { VideoNames } from "@/lib/messages/video-list";
import { ProcessRunner } from "../types";
import { getState, getTeamOwner, saveState, DEFAULT_TEAM_STATE, TerritoryStateDef } from "./territory-state";
import { soloMessageAtLocation } from "../game-messages";
import { getEnemies } from "../game-friends-or-enemies";
import { BaseParams } from "../base-params";

const OWNER = 'territory';
const INCOME_PER_LOCATION = 1;

const winnerVideos: { [id: string]: VideoNames } = {
  barbarian: VideoNames.barbarianWarlordsWin,
  witch: VideoNames.witchWarlordsWin,
  ranger: VideoNames.rangerWarlordsWin,
  mage: VideoNames.mageWarlordsWin,
};

function getTeam(params: BaseParams, state: TerritoryStateDef, team: string) {
  return state.teams[team] ??= {
    ...DEFAULT_TEAM_STATE, territory: [], monsters: [],
    colour: params.gameState.players.find(player => player.team === team)?.rgbColour ?? '',
  };
}

function assignTerritory(params: BaseParams, state: TerritoryStateDef, team: string, locations: number[]) {
  const owner = getTeam(params, state, team);
  for (const [id, faction] of Object.entries(state.teams)) {
    if (id !== team) faction.territory = faction.territory.filter(location => !locations.includes(location));
  }
  owner.territory = [...new Set([...owner.territory, ...locations])];
}

function creditTeam(params: BaseParams, state: TerritoryStateDef, team: string, coins: number) {
  const player = params.gameState.players.find(player => (player.team || player.id) === team);
  if (player) player.coins += coins;
  else getTeam(params, state, team).coins += coins;
  return player;
}

export const territoryProcesses: ProcessRunner = {
  executeForTurn: async (params) => {
    const state = getState(params.gameState);

    // Resolve all conquests first, including chains of leaders defeated this turn.
    const owners = Object.fromEntries(Object.keys(state.teams).map(team => [team, getTeamOwner(state, team)]));
    for (const [team, owner] of Object.entries(owners)) {
      delete state.teams[team].conqueredBy;
      if (team === owner) continue;
      const conquered = state.teams[team];
      assignTerritory(params, state, owner, conquered.territory);
      creditTeam(params, state, owner, conquered.coins);
      conquered.territory = [];
      conquered.coins = 0;
      delete conquered.npcDecision;
    }
    for (const npc of params.gameState.npcs) {
      const owner = npc.team ? owners[npc.team] : undefined;
      if (owner && owner !== npc.team) {
        npc.team = owner;
        if (npc.scriptedActions) npc.masterId = null;
        const command = state.teams[npc.id];
        if (command) delete command.npcDecision;
      }
    }
    for (const monster of params.monsters) {
      if (monster.team && owners[monster.team]) monster.team = owners[monster.team];
    }

    const warlords: (PlayerState | NPCState)[] = [
      ...params.gameState.players,
      ...params.gameState.npcs,
    ].filter(warlord => warlord.health > 0);

    for(const warlord of warlords) {
      const location = warlord.location.id;
      if (!getEnemies(params, warlord).some(enemy => enemy.health > 0)) {
        const team = warlord.team || warlord.id;
        assignTerritory(params, state, team, [location]);
      }
    }

    // Pay each faction once, regardless of how many sub-commanders it has.
    for (const team of new Set(warlords.map(warlord => warlord.team || warlord.id))) {
      const locationCount = getTeam(params, state, team).territory.length;
      const coins = locationCount * INCOME_PER_LOCATION;

      const player = creditTeam(params, state, team, coins);
      if (player) {
        soloMessageAtLocation(params, player.id,
          `*You* earned **${coins} coins** from ${locationCount} location${locationCount === 1 ? '' : 's'}`
        );
      }
    }

    params.gameState.visited = 
      [...new Set(Object.keys(state.teams).map(t => state.teams[t].territory).flat())];

    saveState(params.gameState, state);

    const territoryLEDs: LedState[] = Object.values(state.teams)
      .map(team => team.territory.map(location => ({
        location,
        rgb: team.colour || '808080',
        owner: OWNER
      })))
      .flat();

    params.gameState.leds = [
      ...params.gameState.leds.filter(l => l.owner !== OWNER),
      ...territoryLEDs,
    ];

    if (!state.winner) {
      const teams = Object.entries(state.teams);
      const totalTerritory = teams.reduce((total, [, team]) => total + team.territory.length, 0);
      const winningTeam = teams.find(([, team]) => team.territory.length > 0
        && team.territory.length >= 2 * (totalTerritory - team.territory.length))?.[0];
      const winningPlayer = params.gameState.players.find(player => (player.team || player.id) === winningTeam);
      const winner = winningPlayer ?? params.gameState.npcs.find(npc => npc.id === winningTeam);

      if (winningTeam && winner) {
        state.winner = winningTeam;
        saveState(params.gameState, state);

        for (const player of params.gameState.players) {
          soloMessageAtLocation(params, player.id, (player.team || player.id) === winningTeam
            ? '***You have won the game!*** Your team controls at least twice as much territory as all other teams combined.'
            : `***You have lost the game!*** **${getDisplayName(winner)}** has won with at least twice as much territory as all other teams combined.`);
        }

        await publishPlayVideo(params.boardId, params.mapId,
          winningPlayer ? winnerVideos[winningPlayer.id] : VideoNames.warlordsDefeat);
      }
    }
  }
}
