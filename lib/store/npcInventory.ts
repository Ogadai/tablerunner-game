import { allItems } from '../games/items';
import { PlayerItem, PlayerItemType } from '../games/types';
import { NOTHING_EQUPPED, PlayerInventoryEquipSlots, PlayerInventoryState } from './types';

export function equipBestNpcItems(inventory: PlayerInventoryState): void {
  const equipped: PlayerInventoryEquipSlots = {
    weapon: NOTHING_EQUPPED, armour: NOTHING_EQUPPED, shield: NOTHING_EQUPPED,
    helmet: NOTHING_EQUPPED, gloves: NOTHING_EQUPPED, boots: NOTHING_EQUPPED,
    belt: NOTHING_EQUPPED, ring: NOTHING_EQUPPED, necklace: NOTHING_EQUPPED,
  };
  const bestItems: Partial<Record<keyof PlayerInventoryEquipSlots, PlayerItem>> = {};

  // Placeholder: use item value as a proxy for strength, keeping the first item on ties.
  // TODO: evaluate stat bonuses and the NPC's role instead.
  for (const item of inventory.equipment || []) {
    const definition = allItems[item.type];
    if (!definition || definition.type === PlayerItemType.consumable || definition.type === PlayerItemType.scroll) continue;

    const slot = definition.type;
    const current = bestItems[slot];
    if (!current || (definition.value || 0) > (allItems[current.type].value || 0)) {
      bestItems[slot] = item;
      equipped[slot] = item.id;
    }
  }

  inventory.equipped = equipped;
}
