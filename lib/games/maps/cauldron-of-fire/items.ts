import { lootItems, ConsumableIds } from '../../items';
import { GameItemLocation } from '../../types';

const easyLocations: number[] = [1, 3, 41, 44, 37, 35, 7, 50, 13, 16, 67, 20, 60, 61];
const mediumLocations: number[] = [80, 120, 117, 116, 87, 76, 74, 73, 113, 121, 111, 109, 106, 146, 136, 138, 141, 101, 97, 100, 152, 231, 171];
const hardLocations: number[] = [160, 156, 198, 200, 162, 199, 240, 202, 236, 205, 206, 232, 208, 192, 227, 214, 225, 216, 224, 223, 221, 220, 218];
const resurrectionLocations: number[] = [3, 120, 73, 116, 101, 136, 200, 156, 202, 232, 192];

const easyLoot = Object.entries(lootItems)
  .map(([id, item]) => item)
  .filter(item => item.value && item.value < 50)
  .map(item => item.id);

const mediumLoot = Object.entries(lootItems)
  .map(([id, item]) => item)
  .filter(item => item.value && item.value > 20 && item.value < 150)
  .map(item => item.id);

const hardLoot = Object.entries(lootItems)
  .map(([id, item]) => item)
  .filter(item => item.value && item.value > 120)
  .map(item => item.id);

const easyItems = 40;
const mediumItems = 30;
const hardItems = 20;
const resurrectionItems = 4;

export const cauldronOfFireItems: GameItemLocation[] = [];
for (let n = 0; n < easyItems; n++) {
  cauldronOfFireItems.push({ locations: easyLocations, itemIds: easyLoot });
}
for (let n = 0; n < mediumItems; n++) {
  cauldronOfFireItems.push({ locations: mediumLocations, itemIds: mediumLoot });
}
for (let n = 0; n < hardItems; n++) {
  cauldronOfFireItems.push({ locations: hardLocations, itemIds: hardLoot });
}

for (let n = 0; n < resurrectionItems; n++) {
  cauldronOfFireItems.push({ locations: resurrectionLocations, itemIds: [ConsumableIds.resurrectionShard] });
}
