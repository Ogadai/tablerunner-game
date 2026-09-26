/** @jest-environment node */
import { lichKing } from './lich-king';
import { generateText } from 'ai';
import { getLocationsStateFromRedis, getPlayerMessagesFromRedis, setMonsterActionsStateInRedis } from '../../store/redis-access';
import { publishPlayVideo, publishPreloadVideo } from '../../messages/message-videos';
import { ConsumableIds } from '../../games/items';
import { PlayerActionType } from '../../store/types';
import { createMonster, createParams } from '../test-support/fixtures';

jest.mock('ai', () => ({ generateText: jest.fn(), Output: { object: jest.fn() } }));
jest.mock('@ai-sdk/google', () => ({ google: jest.fn(() => 'mock-model') }));
jest.mock('../../store/redis-access', () => ({ getLocationsStateFromRedis: jest.fn(), getPlayerMessagesFromRedis: jest.fn(), setMonsterActionsStateInRedis: jest.fn() }));
jest.mock('../../messages/message-videos', () => ({ publishPlayVideo: jest.fn(), publishPreloadVideo: jest.fn() }));
beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(Math, 'random').mockReturnValue(0);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

it('sets up a dormant boss and activates it exactly once when a player enters the castle', async () => {
  const params = createParams();
  await lichKing.setup!(params);
  expect(params.monsters).toHaveLength(7);
  expect(params.monsters.find(m => m.id === 'lich-king')).toMatchObject({ location: 224, spells: [] });
  params.gameState.players[0].location.id = 224;
  await lichKing.initialiseForTurn!(params);
  expect(params.messages['lich-king']).toEqual({ messages: [] });
  await lichKing.executeForTurn!(params);
  const boss = params.monsters.find(m => m.id === 'lich-king')!;
  expect(boss.scriptedActions).toBe(true);
  expect(boss.equipment).toHaveLength(8);
  expect(params.gameState.processState['lich-king']).toEqual({ initiated: true });
  await lichKing.executeForTurn!(params);
  expect(params.monsters.filter(m => m.id === 'lich-king')).toEqual([boss]);
  expect(publishPlayVideo).toHaveBeenCalledTimes(1);
});

it('preloads near the castle and announces victory only once', async () => {
  const params = createParams();
  params.gameState.players[0].location.id = 184;
  await lichKing.executeForTurn!(params);
  expect(publishPreloadVideo).toHaveBeenCalledTimes(1);
  expect(publishPlayVideo).not.toHaveBeenCalled();
  params.gameState.processState['lich-king'] = { initiated: true };
  params.monsters = [createMonster({ id: 'lich-king', type: 'lich', health: 0 })];
  await lichKing.executeForTurn!(params);
  await lichKing.executeForTurn!(params);
  expect(params.gameState.processState['lich-king'].gameOver).toBe(true);
  expect(params.messages.hero.messages).toEqual([{ text: 'You have defeated the Evil Lich King! Game Over!' }]);
  expect(publishPlayVideo).toHaveBeenCalledTimes(1);
});

function planningParams() {
  const params = createParams();
  params.gameState.gameId = 'cauldronfire';
  params.gameState.players[0].location.id = 224;
  params.gameState.processState['lich-king'] = { initiated: true };
  params.monsters = [createMonster({ id: 'lich-king', type: 'lich', location: 224, health: 1, spells: [],
    equipment: [{ id: 'p1', type: ConsumableIds.healingPotion }, { id: 'p2', type: ConsumableIds.healingPotion }] })];
  jest.mocked(getLocationsStateFromRedis).mockResolvedValue({ monsters: params.monsters, items: [], coins: [], blockedMoves: [], npcs: [] });
  jest.mocked(getPlayerMessagesFromRedis).mockResolvedValue({ messages: [] });
  return params;
}

it('filters unavailable AI actions and assigns distinct potions without consuming actual inventory', async () => {
  const params = planningParams();
  // Only the structured output is used by this process.
  jest.mocked(generateText).mockResolvedValue({ output: { actions: [
    { name: 'invented action' }, { name: 'drink healing potion' }, { name: 'drink healing potion' },
    { name: 'drink healing potion' }, { name: 'attack' },
  ] } } as unknown as Awaited<ReturnType<typeof generateText>>);
  await lichKing.executeBetweenTurns!(params);
  expect(generateText).toHaveBeenCalledTimes(1);
  expect(setMonsterActionsStateInRedis).toHaveBeenCalledWith('board', 'map', 'lich-king', { actions: [
    { id: 1, type: PlayerActionType.UseItem, description: '', itemId: 'p1' },
    { id: 1, type: PlayerActionType.UseItem, description: '', itemId: 'p2' },
    { id: 1, type: PlayerActionType.Attack, description: '', target: 'hero' },
  ] });
  expect(params.monsters[0].equipment).toHaveLength(2);
});

it('leaves queued actions untouched on an AI failure', async () => {
  const params = planningParams();
  jest.mocked(generateText).mockRejectedValue(new Error('timeout'));
  await expect(lichKing.executeBetweenTurns!(params)).resolves.toBeUndefined();
  expect(console.error).toHaveBeenCalled();
  expect(setMonsterActionsStateInRedis).not.toHaveBeenCalled();
});

it('does not call AI before initiation, after victory, or when nobody is in the castle', async () => {
  const params = planningParams();
  params.gameState.processState['lich-king'] = { initiated: false };
  await lichKing.executeBetweenTurns!(params);
  params.gameState.processState['lich-king'] = { initiated: true, gameOver: true };
  await lichKing.executeBetweenTurns!(params);
  params.gameState.processState['lich-king'] = { initiated: true };
  params.gameState.players[0].location.id = 1;
  await lichKing.executeBetweenTurns!(params);
  expect(generateText).not.toHaveBeenCalled();
  expect(getLocationsStateFromRedis).not.toHaveBeenCalled();
});
