import { GameState, ItemLocationState } from "../store/types";
import { games } from '../games/games';
import { allItems } from "../games/items";
import { createItemForInventory } from "./apply-inventory";

export async function populateItemsForMap(gameState: GameState, mapId: string): Promise<ItemLocationState[]> {
  const game = games.find(g => g.map === mapId);

  const itemLocations = game?.itemLocations || [];

  return itemLocations.map(itemLocation => {
    const location = itemLocation.locations[Math.floor(Math.random() * itemLocation.locations.length)];
    const type = itemLocation.itemIds[Math.floor(Math.random() * itemLocation.itemIds.length)];
    const itemDef = allItems[type];

    const item = createItemForInventory(gameState, itemDef);

    return {
      ...item,
      location,
    };
  });
}