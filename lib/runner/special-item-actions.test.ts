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
