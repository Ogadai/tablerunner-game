/** @jest-environment node */
import { applyPlayerInventory, createItemForInventory } from './apply-inventory';
import { getPlayerInventoryFromRedis } from '../store/redis-access';
import { NOTHING_EQUPPED } from '../store/types';
import { allItems, ConsumableIds } from '../games/items';
import { createNpc, createParams } from './test-support/fixtures';

jest.mock('../store/redis-access', () => ({ getPlayerInventoryFromRedis: jest.fn() }));

it('merges pending slots, removes unequipped slots, and applies empty inventory and zero coins', async () => {
  const params = createParams();
  const player = params.gameState.players[0];
  player.equipped = { weapon: 'sword', armour: 'mail' };
  const npc = createNpc();
  params.gameState.npcs = [npc];
  jest.mocked(getPlayerInventoryFromRedis).mockResolvedValue({
    equipped: { weapon: NOTHING_EQUPPED, helmet: 'hat' }, equipment: [], coins: 0,
    hiredNpcIds: ['missing', npc.id],
  });
  await applyPlayerInventory(params, player);
  expect(getPlayerInventoryFromRedis).toHaveBeenCalledWith('board', 'map', player.id);
  expect(player.equipped).toEqual({ armour: 'mail', helmet: 'hat' });
  expect(player.equipment).toEqual([]);
  expect(player.coins).toBe(0);
  expect(npc.masterId).toBe(player.id);
});

it('preserves inventory when no pending changes exist', async () => {
  const params = createParams();
  const player = params.gameState.players[0];
  const before = structuredClone(player);
  jest.mocked(getPlayerInventoryFromRedis).mockResolvedValue({ equipped: null, equipment: null });
  await applyPlayerInventory(params, player);
  expect(player).toEqual(before);
});

it('allocates distinct inventory IDs from the persisted counter', () => {
  const params = createParams();
  params.gameState.counters.itemId = 8;
  const item = allItems[ConsumableIds.healingPotion];
  expect(createItemForInventory(params.gameState, item)).toEqual({ id: 'i-9', type: item.id });
  expect(createItemForInventory(params.gameState, item)).toEqual({ id: 'i-10', type: item.id });
  expect(params.gameState.counters).toEqual({ itemId: 10, monsterId: 0 });
});
