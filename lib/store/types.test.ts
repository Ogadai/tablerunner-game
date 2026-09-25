import { getDisplayName, getMonsterName } from './types';
import { createPlayer } from './test-support/fixtures';
import { monsters } from '../games/monsters';

it('preserves living names and uses only the first name for zombies', () => {
  expect(getDisplayName(createPlayer())).toBe('Test Hero');
  expect(getDisplayName(createPlayer({ zombie: true }))).toBe('Zombie Test');
  expect(getDisplayName(createPlayer({ name: 'Hero', zombie: true }))).toBe('Zombie Hero');
});

it('labels zombie monsters without duplicating the prefix for the zombie species', () => {
  expect(getMonsterName({ id: 'rat', type: 'rat', health: 1, location: 1 })).toBe(monsters.rat.name);
  expect(getMonsterName({ id: 'rat', type: 'rat', health: 1, location: 1, zombie: true })).toBe(`Zombie ${monsters.rat.name}`);
  expect(getMonsterName({ id: 'z', type: 'zombie', health: 1, location: 1, zombie: true })).toBe(monsters.zombie.name);
});
