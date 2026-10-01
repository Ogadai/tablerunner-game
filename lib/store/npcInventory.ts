import { allItems } from '../games/items';
import { NPC_DATA } from '../games/npc-details';
import { EquipableItemDef, PlayerItem, PlayerItemType } from '../games/types';
import { NOTHING_EQUPPED, NPCState, PlayerInventoryEquipSlots, PlayerInventoryState } from './types';

export function equipBestNpcItems(npc: NPCState, inventory: PlayerInventoryState): void {
  // Older saved hireable NPCs have no class field; their catalogue icon identifies it.
  const characterType = npc.characterType ?? (!npc.monsterType && npc.hireCost > 0
    ? NPC_DATA.find(entry => entry.iconXY.x === npc.iconXY.x && entry.iconXY.y === npc.iconXY.y)?.type
    : undefined);
  const equipped: PlayerInventoryEquipSlots = {
    weapon: NOTHING_EQUPPED, armour: NOTHING_EQUPPED, shield: NOTHING_EQUPPED,
    helmet: NOTHING_EQUPPED, gloves: NOTHING_EQUPPED, boots: NOTHING_EQUPPED,
    belt: NOTHING_EQUPPED, ring: NOTHING_EQUPPED, necklace: NOTHING_EQUPPED,
  };
  const bestItems: Partial<Record<keyof PlayerInventoryEquipSlots, PlayerItem>> = {};

  // Weapons use class preference and price; other slots use useful stat bonuses.
  // Price breaks equal stat scores, and exact ties keep the first item.
  for (const item of inventory.equipment || []) {
    const definition = allItems[item.type];
    if (!definition || definition.type === PlayerItemType.consumable || definition.type === PlayerItemType.scroll) continue;

    const slot = definition.type;
    const current = bestItems[slot];
    const currentDefinition = current && allItems[current.type];
    const preference = getWeaponPreference(characterType, definition);
    const currentPreference = currentDefinition ? getWeaponPreference(characterType, currentDefinition) : 0;
    const score = getItemScore(characterType, definition);
    const currentScore = currentDefinition ? getItemScore(characterType, currentDefinition) : 0;
    if (!currentDefinition || preference > currentPreference
        || (preference === currentPreference && (score > currentScore
          || (score === currentScore && (definition.value || 0) > (currentDefinition.value || 0))))) {
      bestItems[slot] = item;
      equipped[slot] = item.id;
    }
  }

  inventory.equipped = equipped;
}

function getItemScore(characterType: NPCState['characterType'], item: EquipableItemDef): number {
  if (item.type === PlayerItemType.weapon || !characterType) return item.value || 0;

  const bonuses = item.bonusStats;
  const protection = (bonuses?.defence || 0) + (bonuses?.health || 0);
  if (characterType === 'mage' || characterType === 'witch') {
    return protection + (bonuses?.magic || 0);
  }
  return protection + (bonuses?.attack || 0) + (bonuses?.damage || 0);
}

function getWeaponPreference(characterType: NPCState['characterType'], item: EquipableItemDef): number {
  if (item.type !== PlayerItemType.weapon) return 0;

  switch (characterType) {
    case 'ranger':
      return item.ranged ? 1 : 0;
    case 'barbarian':
      return !item.ranged && !item.staff ? 1 : 0;
    case 'witch':
    case 'mage':
      return item.staff ? 2 : (item.bonusStats?.magic || 0) > 0 ? 1 : 0;
    default:
      return 0;
  }
}
