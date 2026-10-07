import { LedState, NPCState, PlayerState } from "@/lib/store/types";
import { ProcessRunner } from "../types";
import { getState, saveState } from "./territory-state";
import { games } from "@/lib/games/games";

const OWNER = 'war-territory';

export const territoryProcesses: ProcessRunner = {
  executeForTurn: async (params) => {
    const state = getState(params.gameState);

    // Check for team colours
    for(const player of params.gameState.players) {
      if (!state.teamColours[player.id]) {
        const game = games.find(g => g.id === params.gameState.gameId);
        const character = game?.characters.find(c => c.id === player.id);
        if (character) {
          state.teamColours[player.id] = character.rgbColour;
          if (!state.teamTerritory[player.id]) {
            state.teamTerritory[player.id] = [player.startLocation];
          }
        }
      }
    }

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
        state.teamTerritory[team] = [
          ...state.teamTerritory[team]?.filter(l => l !== location) || [],
          location
        ];
      }
    }

    saveState(params.gameState, state);

    const territoryLEDs: LedState[] = Object.keys(state.teamTerritory)
      .map(team => state.teamTerritory[team].map(location => ({
        location,
        rgb: state.teamColours[team] || '808080',
        owner: OWNER
      })))
      .flat();

    params.gameState.leds = [
      ...params.gameState.leds.filter(l => l.owner !== OWNER),
      ...territoryLEDs,
    ];
  }
}