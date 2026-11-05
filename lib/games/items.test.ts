import { equipableItems, EquipableIds, allItems } from './items';

describe('Item icons in item-sheet.png', () => {
  it('assigns visually distinct icons for swords', () => {
    const swordSteel = equipableItems[EquipableIds.swordSteel];
    const swordRusty = equipableItems[EquipableIds.swordRusty];
    const swordLegendary = equipableItems[EquipableIds.swordLegendary];
    const swordArcane = equipableItems[EquipableIds.swordArcane];
    const swordInferno = equipableItems[EquipableIds.swordInferno];
    const swordDragon = equipableItems[EquipableIds.swordDragon];

    const swordCoords = [
      swordSteel,
      swordRusty,
      swordLegendary,
      swordArcane,
      swordInferno,
      swordDragon,
    ].map(item => `${item.iconXY?.x},${item.iconXY?.y}`);

    const uniqueCoords = new Set(swordCoords);
    expect(uniqueCoords.size).toBe(swordCoords.length);
    expect(swordSteel.iconXY).toEqual({ x: 0, y: 0 });
    expect(swordRusty.iconXY).toEqual({ x: 8, y: 0 });
    expect(swordLegendary.iconXY).toEqual({ x: 9, y: 0 });
  });

  it('assigns visually distinct icons for axes and hammers', () => {
    const axeHand = equipableItems[EquipableIds.axeHand];
    const axeBattle = equipableItems[EquipableIds.axeBattle];
    const axeWar = equipableItems[EquipableIds.axeWar];
    const hammer = equipableItems[EquipableIds.hammer];
    const warhammer = equipableItems[EquipableIds.warhammer];

    const coords = [
      axeHand,
      axeBattle,
      axeWar,
      hammer,
      warhammer,
    ].map(item => `${item.iconXY?.x},${item.iconXY?.y}`);

    const uniqueCoords = new Set(coords);
    expect(uniqueCoords.size).toBe(coords.length);
    expect(axeHand.iconXY).toEqual({ x: 3, y: 0 });
    expect(axeBattle.iconXY).toEqual({ x: 0, y: 10 });
    expect(axeWar.iconXY).toEqual({ x: 1, y: 10 });
    expect(hammer.iconXY).toEqual({ x: 4, y: 0 });
    expect(warhammer.iconXY).toEqual({ x: 2, y: 10 });
  });

  it('assigns visually distinct icons for daggers', () => {
    const dagger = equipableItems[EquipableIds.dagger];
    const daggerVenom = equipableItems[EquipableIds.daggerVenom];

    expect(dagger.iconXY).toEqual({ x: 5, y: 0 });
    expect(daggerVenom.iconXY).toEqual({ x: 3, y: 10 });
    expect(`${dagger.iconXY?.x},${dagger.iconXY?.y}`).not.toBe(`${daggerVenom.iconXY?.x},${daggerVenom.iconXY?.y}`);
  });

  it('assigns visually distinct icons for all 4 bows', () => {
    const bowWarped = equipableItems[EquipableIds.bowWarped];
    const bowLong = equipableItems[EquipableIds.bowLong];
    const bowElven = equipableItems[EquipableIds.bowElven];
    const bowLegendary = equipableItems[EquipableIds.bowLegendary];

    const bowCoords = [
      bowWarped,
      bowLong,
      bowElven,
      bowLegendary,
    ].map(item => `${item.iconXY?.x},${item.iconXY?.y}`);

    const uniqueCoords = new Set(bowCoords);
    expect(uniqueCoords.size).toBe(4);
    expect(bowWarped.iconXY).toEqual({ x: 6, y: 0 });
    expect(bowLong.iconXY).toEqual({ x: 4, y: 10 });
    expect(bowElven.iconXY).toEqual({ x: 5, y: 10 });
    expect(bowLegendary.iconXY).toEqual({ x: 6, y: 10 });
  });

  it('ensures all item iconXY coordinates are within the sheet bounds (10 cols, 11 rows)', () => {
    for (const [id, item] of Object.entries(allItems)) {
      if (item.iconXY) {
        expect(item.iconXY.x).toBeGreaterThanOrEqual(0);
        expect(item.iconXY.x).toBeLessThan(10);
        expect(item.iconXY.y).toBeGreaterThanOrEqual(0);
        expect(item.iconXY.y).toBeLessThan(11);
      }
    }
  });
});

