/** @jest-environment node */
import { updateMonsterLeds } from './game-action-monsters';
import { createGame } from './test-support/fixtures';

it('lights each visited living-monster location once and clears stale monster LEDs', () => {
  const other = { location: 1, owner: 'portal', rgb: '123456' };
  const game = createGame({ visited: [1, 2, 4], leds: [other, { location: 9, owner: 'monster', rgb: 'FF8000' }] });
  const monsters = [{ location: 1, health: 2 }, { location: 2, health: 3 }, { location: 2, health: 4 }, { location: 3, health: 4 }, { location: 4, health: 0 }];
  updateMonsterLeds(game, monsters);
  expect(game.leds).toEqual([other, { location: 2, owner: 'monster', rgb: 'FF8000' }]);
  updateMonsterLeds(game, monsters);
  expect(game.leds).toEqual([other, { location: 2, owner: 'monster', rgb: 'FF8000' }]);
  updateMonsterLeds(game, []);
  expect(game.leds).toEqual([other]);
});
