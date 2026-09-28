/** @jest-environment node */
import { getFastTravelLocations } from './fast-travel-locations';
import { createMonster, createNpc, createParams, createPlayer } from './test-support/fixtures';
import type { Location } from '../games/types';

const locations: Location[] = Array.from({ length: 7 }, (_, index) => ({
  id: index + 1, description: '', move: index < 6 ? [{ id: index + 2, direction: 'e' }] : [],
}));

it.each(['player', 'npc', 'monster'])('blocks routes through a living enemy %s, but permits allies and corpses', kind => {
  const params = createParams();
  const actor = params.gameState.players[0];
  actor.location = locations[0];
  params.gameState.visited = locations.map(l => l.id);
  const target = kind === 'monster' ? createMonster({ location: 2 })
    : kind === 'npc' ? createNpc({ location: locations[1], team: 'enemy' })
    : createPlayer({ id: 'enemy', location: locations[1], team: 'enemy' });
  if ('type' in target) params.monsters.push(target);
  else if ('masterId' in target) params.gameState.npcs.push(target);
  else params.gameState.players.push(target);
  expect(getFastTravelLocations(params, locations, actor)).toEqual([]);
  target.team = actor.team;
  params.gameState.leds = [{ location: 2, owner: 'monster', rgb: '' }];
  expect(getFastTravelLocations(params, locations, actor)).toEqual([2, 3, 4, 5, 6]);
  target.team = 'enemy';
  target.health = 0;
  expect(getFastTravelLocations(params, locations, actor)).toContain(6);
  params.gameState.leds.push({ location: 2, owner: 'lock', rgb: '' });
  expect(getFastTravelLocations(params, locations, actor)).toEqual([]);
});
