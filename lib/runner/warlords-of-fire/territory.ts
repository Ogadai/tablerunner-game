import { LedState, NPCState, PlayerState } from "@/lib/store/types";
import { ProcessRunner } from "../types";
import { getState, saveState, DEFAULT_TEAM_STATE } from "./territory-state";
import { soloMessageAtLocation } from "../game-messages";

const OWNER = 'territory';
const INCOME_PER_LOCATION = 10;

export const territoryProcesses: ProcessRunner = {
  executeForTurn: async (params) => {
    const state = getState(params.gameState);

    const warlords: (PlayerState | NPCState)[] = [
      ...params.gameState.players,
      ...params.gameState.npcs,
    ];

    for(const warlord of warlords) {
      const location = warlord.location.id;
      if (!warlords.some(w =>
        w.id !== warlord.id &&
        w.location.id === location &&
        w.team !== warlord.team
      )) {
        // This warlord has taken over this territory
        const team = warlord.team || warlord.id;
        state.teams[team] ||= { ...DEFAULT_TEAM_STATE };

        for(const t of Object.keys(state.teams)) {
          state.teams[t].territory = state.teams[t].territory.filter(l => l !== location);
        }
        state.teams[team].territory.push(location);
      }
    }

    // Assign funds to players and NPCs
    for(const warlord of warlords) {
      const team = warlord.id;
      state.teams[team] ||= { ...DEFAULT_TEAM_STATE };
      const locationCount = state.teams[team].territory.length;
      const coins = locationCount * INCOME_PER_LOCATION;

      const player = params.gameState.players.find(p => p.id === warlord.id);
      if (player) {
        player.coins += coins;
        soloMessageAtLocation(params, player.id,
          `*You* earned **${coins} coins** from ${locationCount} location${locationCount === 1 ? '' : 's'}`
        );
      } else {
        state.teams[team].coins += coins;
      }
    }

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
  }
}
