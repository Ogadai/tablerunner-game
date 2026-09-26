/** @jest-environment node */
import { actionUseItem } from './game-action-use';
import { ConsumableIds, consumableItems } from '../games/items';
import { PlayerActionType } from '../store/types';
import { createParams } from './test-support/fixtures';

it.each([
  [ConsumableIds.healingPotion, 'health', 19, 20], [ConsumableIds.manaPotion, 'magic', 9, 10],
] as const)('caps %s restoration and consumes only the selected item', (type, stat, before, after) => {
  const params = createParams();
  const player = params.gameState.players[0];
  player[stat] = before;
  player.equipment = [{ id: 'used', type }, { id: 'kept', type }];
  actionUseItem(params, player, { id: 1, type: PlayerActionType.UseItem, itemId: 'used', description: '' });
  expect(player[stat]).toBe(after);
  expect(player.equipment).toEqual([{ id: 'kept', type }]);
});

it('adds temporary bonuses with an extra turn for end-of-turn processing', () => {
  const item = consumableItems[ConsumableIds.toughPotion];
  const params = createParams();
  const player = params.gameState.players[0];
  player.equipment = [{ id: 'buff', type: item.id }];
  actionUseItem(params, player, { id: 1, type: PlayerActionType.UseItem, itemId: 'buff', description: '' });
  expect(player.effects).toEqual([{ description: 'Toughness Potion', turns: 6, defence: 5 }]);
  expect(player.equipment).toEqual([]);
});

it('retains a resurrection stone when there is nobody to resurrect and ignores missing items', () => {
  const params = createParams();
  const player = params.gameState.players[0];
  player.equipment = [{ id: 'stone', type: ConsumableIds.resurrectionStone }];
  for (const itemId of ['missing', 'stone']) {
    actionUseItem(params, player, { id: 1, type: PlayerActionType.UseItem, itemId, description: '' });
  }
  expect(player.equipment).toEqual([{ id: 'stone', type: ConsumableIds.resurrectionStone }]);
});
