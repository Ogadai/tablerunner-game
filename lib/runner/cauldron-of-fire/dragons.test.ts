/** @jest-environment node */
import { dragons } from './dragons';
import { publishPlayVideo } from '../../messages/message-videos';
import { createMonster, createNpc, createParams } from '../test-support/fixtures';

jest.mock('../../store/redis-access', () => ({}));
jest.mock('../../messages/message-videos', () => ({ publishPlayVideo: jest.fn(), publishPreloadVideo: jest.fn() }));
beforeEach(() => jest.spyOn(Math, 'random').mockReturnValue(0));
afterEach(() => jest.restoreAllMocks());

it('places both dragons with spells and distributes uniquely identified loot', async () => {
  const params = createParams();
  await dragons.setup!(params);
  expect(params.monsters).toEqual([
    expect.objectContaining({ id: 'fire-dragon', location: 202, health: 60, spells: ['fireBreathLarge'] }),
    expect.objectContaining({ id: 'fire-dragon-baby', location: 136, health: 30, spells: ['fireBreathSmall'] }),
  ]);
  expect(params.items).toHaveLength(4);
  expect(new Set(params.items.map(i => i.id)).size).toBe(4);
  expect(params.items.every(i => [202, 136].includes(i.location))).toBe(true);
});

it('erupts after the scheduled turn, killing occupants and destroying shops in lava', async () => {
  const params = createParams({ monsters: [createMonster({ location: 162 })] });
  params.gameState.players[0].location.id = 162;
  params.gameState.npcs = [createNpc({ location: { id: 162, description: '', move: [] } })];
  params.gameState.stores = [162, 1];
  params.gameState.processState.dragons = { lastLava: 0, nextLava: 3 };
  await dragons.executeForTurn!(params);
  expect(params.gameState.players[0].health).toBe(20);
  params.gameState.turn = 4;
  await dragons.executeForTurn!(params);
  expect(params.gameState.players[0]).toMatchObject({ health: 0, respawnTurns: 6 });
  expect(params.gameState.npcs[0].health).toBe(0);
  expect(params.monsters[0].health).toBe(0);
  expect(params.monsters[1]).toMatchObject({ type: 'firespirit', location: 162, health: 20 });
  expect(params.gameState.stores).toEqual([1]);
  expect(params.gameState.locationOverrides).toContainEqual({ id: 162, description: 'This building has been destroyed by Lava' });
});

it('clears lava state and LEDs when an eruption ends', async () => {
  const params = createParams();
  params.gameState.processState.dragons = { lastLava: 0, nextLava: 1, currentLavaTurn: 3, currentLavaMax: 2 };
  params.gameState.leds = [{ location: 162, owner: 'dragons', rgb: '' }, { location: 1, owner: 'portal', rgb: '' }];
  await dragons.executeForTurn!(params);
  expect(params.gameState.processState.dragons).toEqual({ lastLava: 3 });
  expect(params.gameState.leds).toEqual([{ location: 1, owner: 'portal', rgb: '' }]);
});

it('reacts once to the baby’s death and pauses the mother’s route while players are present', async () => {
  const params = createParams();
  await dragons.setup!(params);
  params.monsters[1].health = 0;
  await dragons.executeForTurn!(params);
  expect(params.gameState.processState.dragons.dragonBabyDead).toBe(true);
  expect(publishPlayVideo).toHaveBeenCalledTimes(1);
  await dragons.executeForTurn!(params);
  expect(params.monsters[0].location).toBe(239);
  params.gameState.players[0].location.id = 239;
  await dragons.executeForTurn!(params);
  expect(params.monsters[0].location).toBe(239);
  expect(publishPlayVideo).toHaveBeenCalledTimes(1);
});
