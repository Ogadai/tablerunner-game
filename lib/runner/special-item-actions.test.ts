/** @jest-environment node */
import { specialItemActions } from './special-item-actions';
import { ConsumableIds, KeyIds } from '../games/items';
import { createNpc, createParams, createPlayer } from './test-support/fixtures';

it.each([
  [ConsumableIds.resurrectionStone, 1, false], [ConsumableIds.resurrectionStone, 2, true],
  [ConsumableIds.resurrectionShard, 1, true],
] as const)('resurrects local characters with %s (%i dead)', (item, count, zombie) => {
  const params = createParams();
  const player = params.gameState.players[0];
  const dead = createPlayer({ id: 'dead', health: 0, zombie: true });
  const far = createPlayer({ id: 'far', health: 0, location: { id: 2, move: [], description: '' } });
  params.gameState.players.push(dead, far);
  if (count === 2) params.gameState.npcs.push(createNpc({ health: 0 }));
  expect(specialItemActions[item](params, player)).toBe(true);
  expect(dead).toMatchObject({ health: 1, zombie });
  expect(far.health).toBe(0);
  if (count === 2) expect(params.gameState.npcs[0]).toMatchObject({ health: 1, zombie: true });
});

it('unlocks matching exits for everyone present and preserves unrelated locks and LEDs', () => {
  const params = createParams({ blockedMoves: [
    { location: 1, direction: 'e', description: 'Locked', keyItemType: KeyIds.greenKey },
    { location: 1, direction: 'n', description: 'Other', keyItemType: KeyIds.blueKey },
  ] });
  const player = params.gameState.players[0];
  player.location.move = [{ id: 2, direction: 'e', blockDescription: 'Locked', keyItemType: KeyIds.greenKey }];
  const ally = createPlayer({ id: 'ally', location: structuredClone(player.location) });
  params.gameState.players.push(ally);
  params.gameState.leds = [{ location: 2, owner: 'lock', rgb: '' }, { location: 2, owner: 'portal', rgb: '' }];
  expect(specialItemActions[KeyIds.greenKey](params, player)).toBe(true);
  expect(params.blockedMoves).toEqual([{ location: 1, direction: 'n', description: 'Other', keyItemType: KeyIds.blueKey }]);
  expect(ally.location.move[0].blockDescription).toBeUndefined();
  expect(player.location.move[0].keyItemType).toBeUndefined();
  expect(params.gameState.leds).toEqual([{ location: 2, owner: 'portal', rgb: '' }]);
  expect(specialItemActions[KeyIds.greenKey](params, player)).toBe(false);
});

it('opens a locked chest when a key is used at the chest location', () => {
  const params = createParams();
  const player = params.gameState.players[0];
  player.location = { id: 1, move: [], description: '' };
  const lockedChest = { id: 'c-1', type: 'chest', location: 1, key: KeyIds.goldKey };
  params.items.push(lockedChest);

  expect(specialItemActions[KeyIds.goldKey](params, player)).toBe(true);
  expect(params.items.find(i => i.id === 'c-1')).toBeUndefined();
  expect(params.items.length).toBeGreaterThanOrEqual(1);
  expect(player.coins).toBeGreaterThan(0);
  expect(specialItemActions[KeyIds.goldKey](params, player)).toBe(false);
});

it('does not open chest if key does not match or chest is at a different location', () => {
  const params = createParams();
  const player = params.gameState.players[0];
  player.location = { id: 1, move: [], description: '' };
  const lockedChest = { id: 'c-1', type: 'chest', location: 2, key: KeyIds.goldKey };
  params.items.push(lockedChest);

  // Different location
  expect(specialItemActions[KeyIds.goldKey](params, player)).toBe(false);
  expect(params.items.find(i => i.id === 'c-1')).toBeDefined();

  // Same location, but wrong key
  lockedChest.location = 1;
  expect(specialItemActions[KeyIds.blueKey](params, player)).toBe(false);
  expect(params.items.find(i => i.id === 'c-1')).toBeDefined();

  // Same location, but chest is not locked (no key requirement)
  const regularChest = { id: 'c-2', type: 'chest', location: 1 };
  params.items.push(regularChest);
  expect(specialItemActions[KeyIds.goldKey](params, player)).toBe(true); // opens c-1
  expect(params.items.find(i => i.id === 'c-2')).toBeDefined(); // c-2 untouched
  expect(specialItemActions[KeyIds.goldKey](params, player)).toBe(false); // cannot open c-2 with key
});

it('awards coins to all players at the chest location and generates high tier loot', () => {
  const params = createParams();
  const player = params.gameState.players[0];
  player.location = { id: 1, move: [], description: '' };
  player.coins = 0;

  const ally = createPlayer({ id: 'ally', location: { id: 1, move: [], description: '' }, coins: 5 });
  const other = createPlayer({ id: 'other', location: { id: 2, move: [], description: '' }, coins: 0 });
  params.gameState.players.push(ally, other);

  const lockedChest = { id: 'c-1', type: 'chest', location: 1, key: KeyIds.goldKey };
  params.items.push(lockedChest);

  expect(specialItemActions[KeyIds.goldKey](params, player)).toBe(true);
  expect(player.coins).toBeGreaterThan(0);
  expect(ally.coins).toBe(5 + player.coins);
  expect(other.coins).toBe(0);

  const droppedItems = params.items.filter(i => i.location === 1);
  expect(droppedItems.length).toBeGreaterThanOrEqual(1);
  expect(droppedItems.some(i => i.type === 'chest')).toBe(false);
});
