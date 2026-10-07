import { lootItems, scrollItems, consumableItems, equipableItems, allItems } from '../../items';
import { PlayerItemType } from '../../types';

const starterStores: string[] = [
  ...Object.keys(consumableItems).filter(id => (allItems[id].value || 0) < 150),
  ...Object.keys(equipableItems).filter(id => (allItems[id].value || 0) < 50),
  ...Object.keys(scrollItems).filter(id => (allItems[id].value || 0) < 50),
];

const largeStores: string[] = [
  ...Object.keys(consumableItems).filter(id => (allItems[id].value || 0) < 50),
  ...Object.keys(equipableItems).filter(id => (allItems[id].value || 0) < 150),
  ...Object.keys(scrollItems).filter(id => (allItems[id].value || 0) < 80),
];

export const warlordsOfFireStoreItems: { [locationId: number]: string[] } = {
  10: starterStores,
  231: starterStores,
  121: starterStores,
  100: starterStores,
  128: largeStores,
  24: largeStores,
  203: largeStores,
  135: largeStores,
};

export const visitedLocations: number[] = [10, 231, 121, 100, 110, 24, 203];