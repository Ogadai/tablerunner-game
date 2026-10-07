import { scrollItems, consumableItems, equipableItems, allItems } from '../../items';

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
  235: largeStores,
  135: largeStores,
};

export const visitedLocations: number[] = [10, 231, 121, 100, 128, 24, 235, 135];