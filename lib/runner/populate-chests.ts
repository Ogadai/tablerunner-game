import { GameState, ItemLocationState } from '../store/types';
import { games } from '../games/games';
import { sharedLocations } from '../games/maps/shared-locations';
import { allItems, SpecialIds } from '../games/items';
import { createItemForInventory } from './apply-inventory';
import { getCellCoordinates } from '../games/gridCells';
import { Location } from '../games/types';

export const MIN_CHEST_COUNT = 20;
export const MAX_CHEST_COUNT = 30;

export async function populateChestsForMap(
  gameState: GameState,
  mapId: string,
  targetCount?: number,
): Promise<ItemLocationState[]> {
  const game = games.find(g => g.map === mapId && g.id === gameState.gameId);
  if (!game) {
    return [];
  }

  const chestCount = targetCount ?? (MIN_CHEST_COUNT + Math.floor(Math.random() * (MAX_CHEST_COUNT - MIN_CHEST_COUNT + 1)));
  const locations: Location[] = game.locations || sharedLocations;
  const chestLocations = selectChestLocations(locations, chestCount);

  const chestDef = allItems[SpecialIds.chest];

  return chestLocations.map(locationId => {
    const item = createItemForInventory(gameState, chestDef);
    return {
      ...item,
      location: locationId,
    };
  });
}

export function selectChestLocations(locations: Location[], count: number): number[] {
  if (locations.length === 0 || count <= 0) {
    return [];
  }

  const actualCount = Math.min(count, locations.length);

  interface LocationCandidate {
    id: number;
    underground: boolean;
    singleLink: boolean;
    coords: { row: number; col: number };
    weight: number;
  }

  const candidates: LocationCandidate[] = locations.map(loc => {
    let weight = 0.5;
    if (loc.underground) {
      weight = 12;
    } else if (loc.move.length === 1) {
      weight = 4;
    }

    return {
      id: loc.id,
      underground: Boolean(loc.underground),
      singleLink: !loc.underground && loc.move.length === 1,
      coords: getCellCoordinates(loc.id),
      weight,
    };
  });

  const chosenLocations: LocationCandidate[] = [];

  while (chosenLocations.length < actualCount) {
    const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);

    let chosen: LocationCandidate | undefined;

    if (totalWeight > 0) {
      let randomVal = Math.random() * totalWeight;
      for (let i = 0; i < candidates.length; i++) {
        randomVal -= candidates[i].weight;
        if (randomVal <= 0) {
          chosen = candidates.splice(i, 1)[0];
          break;
        }
      }
      if (!chosen) {
        chosen = candidates.pop()!;
      }
    } else {
      let maxDist = -1;
      let bestIndex = 0;
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        const minDistToChosen = Math.min(
          ...chosenLocations.map(c => Math.hypot(c.coords.row - candidate.coords.row, c.coords.col - candidate.coords.col))
        );
        if (minDistToChosen > maxDist) {
          maxDist = minDistToChosen;
          bestIndex = i;
        }
      }
      chosen = candidates.splice(bestIndex, 1)[0];
    }

    chosenLocations.push(chosen);

    for (const c of candidates) {
      const dist = Math.hypot(c.coords.row - chosen.coords.row, c.coords.col - chosen.coords.col);
      if (dist < 1.5) {
        c.weight = 0;
      } else if (dist < 3) {
        c.weight *= 0.2;
      } else if (dist < 5) {
        c.weight *= 0.6;
      }
    }
  }

  return chosenLocations.map(c => c.id);
}

