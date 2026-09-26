/** @jest-environment node */
import { keyProcess } from './key-processes';
import { KeyIds } from '../../games/items';
import { createParams } from '../test-support/fixtures';

jest.mock('../../store/redis-access', () => ({}));
afterEach(() => jest.restoreAllMocks());

it('creates a reachable key and prize for each quest with unique inventory IDs', async () => {
  jest.spyOn(Math, 'random').mockReturnValue(0);
  const params = createParams();
  await keyProcess.setup!(params);
  expect(params.blockedMoves.map(b => [b.location, b.direction, b.keyItemType])).toEqual([
    [2, 'e', KeyIds.greenKey], [82, 'w', KeyIds.blueKey], [138, 'w', KeyIds.purpleKey],
    [184, 'n', KeyIds.skeletonKey], [239, 's', KeyIds.fireKey],
  ]);
  expect(params.items.filter(item => Object.values(KeyIds).includes(item.type as KeyIds)).map(item => [item.type, item.location])).toEqual([
    [KeyIds.greenKey, 37], [KeyIds.blueKey, 73], [KeyIds.purpleKey, 101], [KeyIds.skeletonKey, 202], [KeyIds.fireKey, 200],
  ]);
  expect(params.items).toHaveLength(10);
  expect(new Set(params.items.map(item => item.id)).size).toBe(10);
  expect(params.gameState.counters.itemId).toBe(10);
});

it('locks every direction of a multi-exit quest with the same key', async () => {
  jest.spyOn(Math, 'random').mockReturnValue(0.99);
  const params = createParams();
  await keyProcess.setup!(params);
  expect(params.blockedMoves.filter(b => b.location === 85).map(b => b.direction)).toEqual(['e', 's']);
  expect(params.items.filter(item => item.type === KeyIds.blueKey)).toHaveLength(1);
});
