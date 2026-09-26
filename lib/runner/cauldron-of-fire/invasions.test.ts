/** @jest-environment node */
import { invasions } from './invasions';
import { createParams } from '../test-support/fixtures';

afterEach(() => jest.restoreAllMocks());

function invasion() {
  return { key: 'test', startTurn: 3, endTurn: 5, monsterType: 'rat', maxCount: 4,
    maxPerLocation: 2, startLocations: [4], locations: [4, 5], monsterIDs: [] as string[] };
}

it.each([0, 0.99])('selects two or three scheduled invasions with randomized timing (%s)', async roll => {
  jest.spyOn(Math, 'random').mockReturnValue(roll);
  const params = createParams();
  await invasions.setup!(params);
  const scheduled = params.gameState.processState.invasions as ReturnType<typeof invasion>[];
  expect(scheduled).toHaveLength(roll === 0 ? 2 : 3);
  expect(new Set(scheduled.map(i => i.key)).size).toBe(scheduled.length);
  for (const entry of scheduled) {
    expect(entry.endTurn).toBeGreaterThan(entry.startTurn);
    expect(entry.monsterIDs).toEqual([]);
  }
});

it('starts at the scheduled turn, respects occupied start slots, and lights only living invaders', async () => {
  jest.spyOn(Math, 'random').mockReturnValue(0);
  const params = createParams();
  const event = invasion();
  params.gameState.processState.invasions = [event];
  await invasions.executeForTurn!(params);
  expect(params.monsters).toHaveLength(2);
  expect(event.monsterIDs).toEqual(params.monsters.map(m => m.id));
  expect(params.messages.hero.messages[0].text).toContain('invasion has started');
  expect(params.gameState.leds).toEqual([{ location: 4, owner: 'invasions', rgb: '9E8209' }]);
  params.gameState.turn = 4;
  await invasions.executeForTurn!(params);
  expect(params.monsters).toHaveLength(2);
  params.monsters.forEach(m => { m.health = 0; });
  params.gameState.turn = 6;
  await invasions.executeForTurn!(params);
  expect(params.gameState.leds).toEqual([]);
});

it('does not spawn before an invasion begins', async () => {
  const params = createParams();
  params.gameState.turn = 2;
  params.gameState.processState.invasions = [invasion()];
  await invasions.executeForTurn!(params);
  expect(params.monsters).toEqual([]);
  expect(params.messages.hero.messages).toEqual([]);
});
