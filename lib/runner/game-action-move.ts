import {
  GameState,
  PlayerActionMove,
  PlayerState,
} from "../store/types";
import { games } from "../games/games";
import { OPPOSITE_DIRECTION } from '@/lib/games/types';
import { BaseParams } from './base-params';
import { getPlayerLocation } from "./game-location";

export const LOCKED_LOCATION_OWNER = 'lock';
const LOCKED_LOCATION_RGB = '500000';

export function actionMove(params: BaseParams, player: PlayerState, action: PlayerActionMove): void {
  try {
    const gameDef = games.find(g => g.id === params.gameState.gameId)!;

    const currentLocation = gameDef.locations.find(l => l.id === player.location.id)!;
    const locationMove = currentLocation.move.find(m => m.direction === action.direction);

    const locationBlock = params.blockedMoves.find(b => b.location === player.location.id);
    if (locationBlock && locationBlock.direction === action.direction) {
      // Cannot make this move
      return;
    }

    if (locationMove) {
      const newLocation = gameDef.locations.find(l => l.id === locationMove.id)!;
      player.location = getPlayerLocation(params, newLocation)

      player.retreatDirection = OPPOSITE_DIRECTION[action.direction];
      params.gameState.visited = [
        ...params.gameState.visited.filter(v => v !== locationMove.id),
        locationMove.id
      ];

      const lockLocations = player.location.move
        .filter(m => !!m.blockDescription)
        .map(m => m.id);

      updateLockLeds(params.gameState, lockLocations, true);
    }
  } catch(error) {
    console.error(`Error: actionMove for ${player.id}`, action);
    throw error;
  }
}

export function updateLockLeds(gameState: GameState, locations: number[], locked: boolean) {
  if (locations.length > 0) {
    const addedLocations = locked
      ? locations.map(l => ({ location: l, rgb: LOCKED_LOCATION_RGB, owner: LOCKED_LOCATION_OWNER }))
      : [];

    gameState.leds = [
      ...gameState.leds.filter(l => l.owner !== LOCKED_LOCATION_OWNER || !locations.includes(l.location)),
      ...addedLocations,
    ];
  }
}