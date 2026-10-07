import { getCellCoordinates } from '../../gridCells';
import { lootItems } from '../../items';
import { GameItemLocation } from '../../types';

const locations: number[] = [
  1, 3, 41, 44, 37, 35, 7, 50, 13, 16, 67, 20, 60, 61,
  80, 120, 117, 116, 87, 76, 74, 73, 113, 111, 109, 106, 146, 136, 138, 141, 101, 97, 152, 171,
  160, 156, 198, 200, 162, 199, 240, 202, 236, 205, 206, 232, 208, 192, 227, 214, 225, 216, 224, 223, 221, 220, 218
];

const easyLoot = Object.values(lootItems)
  .filter(item => item.value && item.value < 50)
  .map(item => item.id);

const mediumLoot = Object.values(lootItems)
  .filter(item => item.value && item.value > 20 && item.value < 150)
  .map(item => item.id);

const hardLoot = Object.values(lootItems)
  .filter(item => item.value && item.value > 120)
  .map(item => item.id);

const easyItems = 40;
const mediumItems = 30;
const hardItems = 20;

const startCells = [10, 231, 121, 100];
function getDistanceFromStart(cell: number): number {
  const cellXY = getCellCoordinates(cell);

  return Math.min(...startCells.map(startCell => {
    const startXY = getCellCoordinates(startCell);
    const vector = {
      x: cellXY.col - startXY.col,
      y: cellXY.row - startXY.row,
    };

    return 0.3 * Math.abs(vector.x) + 1.5 * Math.abs(vector.y);
  }));
}

const easyLocations = locations.filter(loc => getDistanceFromStart(loc) < 3);
const mediumLocations = locations.filter(loc => getDistanceFromStart(loc) >= 3 && getDistanceFromStart(loc) < 6);
const hardLocations = locations.filter(loc => getDistanceFromStart(loc) >= 6);

export const warlordsOfFireItems: GameItemLocation[] = [];
for (let n = 0; n < easyItems; n++) {
  warlordsOfFireItems.push({ locations: easyLocations, itemIds: easyLoot });
}
for (let n = 0; n < mediumItems; n++) {
  warlordsOfFireItems.push({ locations: mediumLocations, itemIds: mediumLoot });
}
for (let n = 0; n < hardItems; n++) {
  warlordsOfFireItems.push({ locations: hardLocations, itemIds: hardLoot });
}
