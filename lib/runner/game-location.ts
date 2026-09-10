import { PlayerLocationMove, PlayerStateLocation } from "../store/types";
import { Location, LocationMove } from '../games/types';
import { BaseParams } from "./base-params";

export function getPlayerLocation(baseParams: BaseParams, location: Location): PlayerStateLocation {
  const getMove = (mv: LocationMove): PlayerLocationMove => {
    const blockedMove = baseParams.blockedMoves.find(b => b.location === location.id && b.direction === mv.direction);

    return {
      ...mv,
      blockDescription: blockedMove?.description,
      keyItemType: blockedMove?.keyItemType,
    }
  }

  return {
    ...location,
    move: location.move.map(getMove)
  };
}

//keyItemType