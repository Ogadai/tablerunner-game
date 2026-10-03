/** @jest-environment node */
import { dragons } from './dragons';
import { publishPlayVideo } from '../../messages/message-videos';
import { createMonster, createNpc, createParams } from '../test-support/fixtures';

jest.mock('../../store/redis-access', () => ({}));
jest.mock('../../messages/message-videos', () => ({ publishPlayVideo: jest.fn(), publishPreloadVideo: jest.fn() }));
beforeEach(() => jest.spyOn(Math, 'random').mockReturnValue(0));
afterEach(() => jest.restoreAllMocks());

it.each([
  { location: 118, colRandom: 0.5, rowRandom: 0.9, expected: 123 },
  { location: 118, colRandom: 0.5, rowRandom: 0, expected: 118 },
  { location: 222, colRandom: 0.1, rowRandom: 0.5, expected: 223 },
  { location: 2, colRandom: 0.5, rowRandom: 0, expected: 2 },
  { location: 121, colRandom: 0.6, rowRandom: 0.5, expected: 122 },
  { location: 130, colRandom: 0.6, rowRandom: 0.5, expected: 130 },
  { location: 100, colRandom: 0.4, rowRandom: 0.5, expected: 99 },
  { location: 130, colRandom: 0.4, rowRandom: 0.5, expected: 130 },
])('wanders from $location toward $expected while respecting underground cells and map bounds', async ({ location, colRandom, rowRandom, expected }) => {
  const dragon = createMonster({ type: 'dragon', location });
  const params = createParams({ monsters: [dragon] });
  params.gameState.gameId = 'cauldronfire';
  params.gameState.processState.dragons = {
    lastLava: 0, nextLava: 100, dragonBabyDead: true,
    dragonRoute: [location], dragonFlightTurn: 1,
  };
  jest.spyOn(Math, 'random')
    .mockReturnValueOnce(colRandom)
    .mockReturnValueOnce(rowRandom);

  await dragons.executeForTurn!(params);

  expect(dragon.location).toBe(expected);
});

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

it('warns for one turn after the scheduled eruption before killing occupants and destroying shops in lava', async () => {
  const params = createParams({ monsters: [createMonster({ location: 162 })] });
  params.gameState.players[0].location.id = 162;
  params.gameState.npcs = [createNpc({ location: { id: 162, description: '', move: [] } })];
  params.gameState.stores = [162, 1];
  params.gameState.processState.dragons = { lastLava: 0, nextLava: 3 };
  await dragons.executeForTurn!(params);
  expect(params.gameState.players[0].health).toBe(20);
  expect(params.gameState.leds).toEqual([]);

  params.gameState.turn = 4;
  await dragons.executeForTurn!(params);
  expect(params.gameState.players[0].health).toBe(20);
  expect(params.gameState.players[0].respawnTurns).toBeUndefined();
  expect(params.gameState.npcs[0].health).toBe(20);
  expect(params.monsters).toEqual([expect.objectContaining({ type: 'rat', health: 5 })]);
  expect(params.gameState.stores).toEqual([162, 1]);
  expect(params.gameState.locationOverrides).toEqual([]);
  expect(params.gameState.leds).toContainEqual({ location: 162, owner: 'dragons', rgb: '9E4217' });

  params.gameState.turn = 5;
  await dragons.executeForTurn!(params);
  expect(params.gameState.players[0]).toMatchObject({ health: 0, respawnTurns: 3 });
  expect(params.gameState.npcs[0].health).toBe(0);
  expect(params.monsters[0].health).toBe(0);
  expect(params.monsters[1]).toMatchObject({ type: 'firespirit', location: 162, health: 20 });
  expect(params.gameState.stores).toEqual([1]);
  expect(params.gameState.locationOverrides).toContainEqual({ id: 162, description: 'This building has been destroyed by Lava' });
});

it('preserves existing fire spirits without replacing them on successive lava turns', async () => {
  const fireSpirit = createMonster({ id: 'fire-spirit-rat', type: 'firespirit', location: 162, health: 7 });
  const params = createParams({ monsters: [fireSpirit] });
  params.gameState.processState.dragons = { lastLava: 0, currentLavaTurn: 0, currentLavaMax: 2 };

  for (let turn = 0; turn < 2; turn++) {
    await dragons.executeForTurn!(params);

    expect(params.monsters).toEqual([
      { id: 'fire-spirit-rat', type: 'firespirit', location: 162, health: 7, team: 'monster', },
    ]);
    params.gameState.turn++;
  }
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
  expect(params.gameState.processState.dragons).toEqual(expect.objectContaining({ dragonBabyDead: true }));
  expect(publishPlayVideo).toHaveBeenCalledTimes(1);
  await dragons.executeForTurn!(params);
  expect(params.monsters[0].location).toBe(239);
  params.gameState.players[0].location.id = 239;
  await dragons.executeForTurn!(params);
  expect(params.monsters[0].location).toBe(239);
  expect(publishPlayVideo).toHaveBeenCalledTimes(1);
});
