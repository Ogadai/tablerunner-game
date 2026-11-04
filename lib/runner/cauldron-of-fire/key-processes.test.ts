/** @jest-environment node */
import { keyProcess } from './key-processes';
import { KeyIds, SpecialIds } from '../../games/items';
import { createParams } from '../test-support/fixtures';

jest.mock('../../store/redis-access', () => ({}));
afterEach(() => jest.restoreAllMocks());

it('creates keys, doors, and chests with unique inventory IDs', async () => {
  jest.spyOn(Math, 'random').mockReturnValue(0);
  const params = createParams();
  await keyProcess.setup!(params);

  // When Math.random is 0:
  // count = 1, greenKey is picked as chest, goldKey is always chest.
  // blueKey, purpleKey, skeletonKey, fireKey are doors.
  expect(params.blockedMoves.map(b => [b.location, b.direction, b.keyItemType])).toEqual([
    [82, 'w', KeyIds.blueKey], [138, 'w', KeyIds.purpleKey],
    [184, 'n', KeyIds.skeletonKey], [239, 's', KeyIds.fireKey],
  ]);

  // Keys placed
  expect(params.items.filter(item => Object.values(KeyIds).includes(item.type as KeyIds)).map(item => [item.type, item.location])).toEqual([
    [KeyIds.greenKey, 37], [KeyIds.blueKey, 73], [KeyIds.purpleKey, 101],
    [KeyIds.goldKey, 166], [KeyIds.skeletonKey, 202], [KeyIds.fireKey, 200],
  ]);

  // Locked chests created
  const lockedChests = params.items.filter(item => item.type === SpecialIds.chest && item.key);
  expect(lockedChests.map(c => [c.key, c.location])).toEqual([
    [KeyIds.greenKey, 3],
    [KeyIds.goldKey, 236],
  ]);

  expect(params.items).toHaveLength(12);
  expect(new Set(params.items.map(item => item.id)).size).toBe(12);
  expect(params.gameState.counters.itemId).toBe(12);
});

it('randomly selects 1 or 2 of green/blue/purple keys for locked chests', async () => {
  // Test with random return values that select 2 keys:
  // Math.random() values:
  // 1st: 0.6 -> count = 2
  // 2nd: 0.8 -> pool['greenKey', 'blueKey', 'purpleKey'] index 2 = purpleKey
  // 3rd: 0.1 -> pool['greenKey', 'blueKey'] index 0 = greenKey
  // chestKeys: [goldKey, purpleKey, greenKey]
  const randomValues = [0.6, 0.8, 0.1];
  let call = 0;
  jest.spyOn(Math, 'random').mockImplementation(() => {
    if (call < randomValues.length) return randomValues[call++];
    return 0;
  });

  const params = createParams();
  await keyProcess.setup!(params);

  const lockedChests = params.items.filter(item => item.type === SpecialIds.chest && item.key);
  const chestKeys = lockedChests.map(c => c.key);
  expect(chestKeys).toContain(KeyIds.goldKey);
  expect(chestKeys).toContain(KeyIds.purpleKey);
  expect(chestKeys).toContain(KeyIds.greenKey);
  expect(chestKeys).not.toContain(KeyIds.blueKey);

  // blueKey should have blockedMoves
  expect(params.blockedMoves.some(b => b.keyItemType === KeyIds.blueKey)).toBe(true);
  expect(params.blockedMoves.some(b => b.keyItemType === KeyIds.greenKey)).toBe(false);
  expect(params.blockedMoves.some(b => b.keyItemType === KeyIds.purpleKey)).toBe(false);
});

it('locks every direction of a multi-exit door quest when a door quest is selected', async () => {
  // Pick greenKey and purpleKey as chests, blueKey as door at location 85
  // pool: [greenKey, blueKey, purpleKey]
  // count = 1: index 0 = greenKey
  // then for locations, blueKey selects option index 1 (location 85)
  const sequence = [
    0, // count = 1
    0, // index 0 = greenKey
    0, // green option 0
    0, // green keyLocation 0
    0, // green prizeLocation 0
    0.99, // blue option 1 (location 85)
    0, // blue directions
    0, // blue keyLocation
    0, // blue prizeLocation
    0, // blue prizeItem
  ];
  let seqIdx = 0;
  jest.spyOn(Math, 'random').mockImplementation(() => (seqIdx < sequence.length ? sequence[seqIdx++] : 0));

  const params = createParams();
  await keyProcess.setup!(params);

  expect(params.blockedMoves.filter(b => b.location === 85).map(b => b.direction)).toEqual(['e', 's']);
  expect(params.items.filter(item => item.type === KeyIds.blueKey)).toHaveLength(1);
});
