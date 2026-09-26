/** @jest-environment node */
import { zombies } from './zombies';
import { createMonster, createParams, createPlayer } from '../test-support/fixtures';

jest.mock('../../games/games', () => ({ games: [{ id: 'test-game', locations: [
  { id: 1, move: [{ id: 2, direction: 'e' }, { id: 3, direction: 'w' }] },
] }] }));
afterEach(() => jest.restoreAllMocks());

it('advances living infections and converts only when their countdown expires', async () => {
  jest.spyOn(Math, 'random').mockReturnValue(0.99);
  const params = createParams({ monsters: [createMonster({ infected: 2 }), createMonster({ id: 'dead', infected: 1, health: 0 })] });
  params.gameState.players[0].infected = 1;
  params.gameState.players.push(createPlayer({ id: 'dead-player', health: 0, infected: 1 }));
  await zombies.executeForTurn!(params);
  expect(params.monsters[0]).toMatchObject({ infected: 1 });
  expect(params.monsters[0].zombie).toBeUndefined();
  expect(params.monsters[1].infected).toBe(1);
  expect(params.gameState.players[0]).toMatchObject({ infected: 0, zombie: true });
  expect(params.gameState.players[1].infected).toBe(1);
});

it('infects colocated monsters but prevents reproduction and travel while a living player is present', async () => {
  const random = jest.spyOn(Math, 'random').mockReturnValue(0);
  const params = createParams({ monsters: [createMonster({ zombie: true }), createMonster({ id: 'other' })] });
  await zombies.executeForTurn!(params);
  expect(params.monsters).toHaveLength(2);
  expect(params.monsters[1].zombie).toBe(true);
  expect(params.monsters[0].location).toBe(1);
  expect(random).not.toHaveBeenCalled();
});

it('travels through an unblocked exit and destroys a shop with extra zombies', async () => {
  // No reproduction, travel, pick first unblocked exit, create two shop zombies.
  jest.spyOn(Math, 'random').mockReturnValue(0.5).mockReturnValueOnce(0.99).mockReturnValueOnce(0).mockReturnValueOnce(0);
  const params = createParams({ monsters: [createMonster({ zombie: true })],
    blockedMoves: [{ location: 1, direction: 'e', description: 'Locked' }] });
  params.gameState.players[0].location.id = 9;
  params.gameState.stores = [2, 3];
  await zombies.executeForTurn!(params);
  expect(params.monsters[0].location).toBe(3);
  expect(params.gameState.stores).toEqual([2]);
  expect(params.monsters.filter(m => m.type === 'zombie' && m.location === 3)).toHaveLength(2);
});

it('shows zombie LEDs only when infection occupies multiple locations and clears stale LEDs', async () => {
  jest.spyOn(Math, 'random').mockReturnValue(0.99);
  const params = createParams({ monsters: [createMonster({ zombie: true }), createMonster({ id: 'other', zombie: true, location: 2 })] });
  params.gameState.leds = [{ location: 9, owner: 'zombies', rgb: '' }, { location: 1, owner: 'portal', rgb: '' }];
  await zombies.executeForTurn!(params);
  expect(params.gameState.leds.filter(l => l.owner === 'zombies').map(l => l.location)).toEqual([1, 2]);
  params.monsters[1].health = 0;
  await zombies.executeForTurn!(params);
  expect(params.gameState.leds).toEqual([{ location: 1, owner: 'portal', rgb: '' }]);
});
