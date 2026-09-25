import { lootItems, scrollItems, consumableItems, equipableItems, allItems } from '../../items';
import { PlayerItemType } from '../../types';

const witchStoreItems: string[] = [
  ...Object.keys(consumableItems),
  ...Object.keys(scrollItems),
  ...lootItems
    .filter(l => [
      PlayerItemType.ring, PlayerItemType.necklace,
    ].includes(l.type))
    .map(i => i.id)
];

const smallShopItems: string[] = [
  ...Object.keys(consumableItems).filter(id => (allItems[id].value || 0) < 150),
  ...Object.keys(equipableItems).filter(id => (allItems[id].value || 0) < 50),
  ...Object.keys(scrollItems).filter(id => (allItems[id].value || 0) < 50),
];

const tavernItems: string[] = [
  ...Object.keys(consumableItems).filter(id => (allItems[id].value || 0) < 50),
  ...Object.keys(equipableItems).filter(id => (allItems[id].value || 0) < 150),
  ...Object.keys(scrollItems).filter(id => (allItems[id].value || 0) < 80),
];

const blacksmithItems: string[] = lootItems
  .filter(l => [
    PlayerItemType.weapon, PlayerItemType.armour, PlayerItemType.helmet,
    PlayerItemType.gloves, PlayerItemType.boots, PlayerItemType.belt,
  ].includes(l.type))
  .map(i => i.id);

const generalItems: string[] = [
  ...Object.keys(consumableItems),
  ...Object.keys(equipableItems),
];

const villageSquareItems: string[] = generalItems.filter(id => (allItems[id].value || 0) < 100);

export const cauldronOfFireStoreItems: { [locationId: number]: string[] } = {
  22: villageSquareItems,
  57: smallShopItems,
  58: tavernItems,
  80: witchStoreItems,
  90: blacksmithItems,
  91: villageSquareItems,
  110: tavernItems,
  123: smallShopItems,
  121: tavernItems,
};
