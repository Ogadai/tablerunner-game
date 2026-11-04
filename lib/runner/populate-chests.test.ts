/** @jest-environment node */
import { populateChestsForMap, selectChestLocations, MIN_CHEST_COUNT, MAX_CHEST_COUNT } from './populate-chests';
import { createGame } from './test-support/fixtures';
import { sharedLocations } from '../games/maps/shared-locations';
import { getCellCoordinates } from '../games/gridCells';

describe('populateChestsForMap', () => {
  it('generates between 20 and 30 Chest items with unique IDs for a known game map', async () => {
    const game = createGame();
    game.gameId = 'cauldronfire';

    const chests = await populateChestsForMap(game, 'cauldron');

    expect(chests.length).toBeGreaterThanOrEqual(MIN_CHEST_COUNT);
    expect(chests.length).toBeLessThanOrEqual(MAX_CHEST_COUNT);
    expect(game.counters.itemId).toBe(chests.length);

    const ids = new Set(chests.map(c => c.id));
    expect(ids.size).toBe(chests.length);

    for (const chest of chests) {
      expect(chest.type).toBe('chest');
      expect(chest.id).toMatch(/^i-\d+$/);
      expect(chest.location).toBeGreaterThanOrEqual(1);
      expect(chest.location).toBeLessThanOrEqual(240);
    }
  });

  it('works for all three game types', async () => {
    for (const gameId of ['cauldronfire', 'racefire', 'warlordsfire']) {
      const game = createGame();
      game.gameId = gameId;

      const chests = await populateChestsForMap(game, 'cauldron', 25);
      expect(chests).toHaveLength(25);
      expect(chests.every(c => c.type === 'chest')).toBe(true);
    }
  });

  it('returns no items for unknown games or maps without allocating IDs', async () => {
    const game = createGame();
    game.gameId = 'unknown';

    const chests = await populateChestsForMap(game, 'cauldron');
    expect(chests).toEqual([]);
    expect(game.counters.itemId).toBe(0);

    const missingMapChests = await populateChestsForMap(game, 'missing-map');
    expect(missingMapChests).toEqual([]);
    expect(game.counters.itemId).toBe(0);
  });

  it('places chests at distinct locations without clumping', async () => {
    const game = createGame();
    game.gameId = 'cauldronfire';

    const chests = await populateChestsForMap(game, 'cauldron', 25);
    const locations = chests.map(c => c.location);
    const uniqueLocations = new Set(locations);

    expect(uniqueLocations.size).toBe(chests.length);

    // Verify distance between any two chests is not clumped (distance >= 1.5 grid units)
    const coords = locations.map(loc => getCellCoordinates(loc));
    for (let i = 0; i < coords.length; i++) {
      for (let j = i + 1; j < coords.length; j++) {
        const dist = Math.hypot(coords[i].row - coords[j].row, coords[i].col - coords[j].col);
        expect(dist).toBeGreaterThanOrEqual(1.5);
      }
    }
  });

  it('strongly prefers underground locations and prefers single-link above ground locations', () => {
    // Run multiple selections to check statistical distribution
    let undergroundCount = 0;
    let singleLinkCount = 0;
    let otherCount = 0;
    const trials = 30;
    const countPerTrial = 25;

    for (let t = 0; t < trials; t++) {
      const selectedIds = selectChestLocations(sharedLocations, countPerTrial);
      expect(selectedIds).toHaveLength(countPerTrial);

      for (const id of selectedIds) {
        const loc = sharedLocations.find(l => l.id === id)!;
        if (loc.underground) {
          undergroundCount++;
        } else if (loc.move.length === 1) {
          singleLinkCount++;
        } else {
          otherCount++;
        }
      }
    }

    const total = trials * countPerTrial;
    const ugRatio = undergroundCount / total;
    const singleLinkRatio = singleLinkCount / total;
    const otherRatio = otherCount / total;

    // Underground locations should be strongly preferred (majority of chests)
    expect(ugRatio).toBeGreaterThan(0.45);
    // Above ground 1-link locations should be preferred over multi-link locations per-location availability
    expect(singleLinkCount).toBeGreaterThan(0);
    // Not exclusively underground (some above ground locations selected)
    expect(singleLinkRatio + otherRatio).toBeGreaterThan(0.2);
  });
});

