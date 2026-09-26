/** @jest-environment node */
import { getPlayerLocation } from './game-location';
import type { Location } from '../games/types';
import { createParams } from './test-support/fixtures';

it('annotates only matching blocked directions without mutating map definitions', () => {
  const location: Location = { id: 1, description: 'Hall', move: [{ id: 2, direction: 'e' }, { id: 3, direction: 'w' }] };
  const params = createParams({ blockedMoves: [
    { location: 1, direction: 'e', description: 'Locked', keyItemType: 'key' },
    { location: 2, direction: 'w', description: 'Elsewhere' },
  ] });
  const result = getPlayerLocation(params, location);
  expect(result.move[0]).toEqual({ id: 2, direction: 'e', blockDescription: 'Locked', keyItemType: 'key' });
  expect(result.move[1].blockDescription).toBeUndefined();
  expect(location.move[0]).toEqual({ id: 2, direction: 'e' });
  expect(result).not.toBe(location);
});
