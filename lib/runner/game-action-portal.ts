import {
  GameState,
  PlayerActionPortal,
  PlayerState,
} from "../store/types";
import { games } from "../games/games";
import { BaseParams } from './base-params';
import { getPlayerLocation } from "./game-location";
import { playerMessageAtLocation, soloMessageAtLocation } from './game-messages';

export function actionPortal(params: BaseParams, player: PlayerState, action: PlayerActionPortal): void {
  try {
    const gameDef = games.find(g => g.id === params.gameState.gameId)!;
    const destinationLocation = gameDef.locations.find(l => l.id === action.targetLocation);

    if (!destinationLocation) {
      console.error(`Destination location ${action.targetLocation} not found for portal`);
      return;
    }

    if (!params.gameState.portals.includes(action.targetLocation)) {
      console.error(`Destination location ${action.targetLocation} is not a valid portal`);
      return;
    }

    const fromLocationId = player.location.id;

    // Move player to destination
    player.location = getPlayerLocation(params, destinationLocation);
    player.retreatDirection = undefined;

    // Update visited locations on game state
    params.gameState.visited = [
      ...params.gameState.visited.filter(v => v !== destinationLocation.id),
      destinationLocation.id
    ];

    // Ensure portal locations are recorded in gameState.visitedPortals
    if (!params.gameState.visitedPortals) {
      params.gameState.visitedPortals = [];
    }
    if (!params.gameState.visitedPortals.includes(destinationLocation.id)) {
      params.gameState.visitedPortals.push(destinationLocation.id);
    }
    if (!params.gameState.visitedPortals.includes(fromLocationId)) {
      params.gameState.visitedPortals.push(fromLocationId);
    }

    playerMessageAtLocation(
      params,
      player.id,
      `**{player}** activated the Portal Stone and materialized at **Location ${destinationLocation.id}**!`
    );

    updatePortalLeds(params.gameState);
  } catch (error) {
    console.error(`Error: actionPortal for ${player.id}`, action);
    throw error;
  }
}

export const PORTAL_LED_OWNER = 'portal';
export const PORTAL_LED_RGB = '003B5C';

export function updatePortalLeds(gameState: GameState) {
  if (gameState.portals && gameState.portals.length > 0) {
    const discoveredPortals = gameState.portals.filter(
      p => gameState.visitedPortals?.includes(p) || gameState.visited.includes(p)
    );
    const portalLeds = discoveredPortals.map(l => ({
      location: l,
      rgb: PORTAL_LED_RGB,
      owner: PORTAL_LED_OWNER,
    }));

    gameState.leds = [
      ...gameState.leds.filter(l => l.owner !== PORTAL_LED_OWNER),
      ...portalLeds,
    ];
  }
}

