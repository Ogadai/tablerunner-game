import { createStarterPlayer } from './game-creation';

it('creates a player with the Cauldron of Fire starting properties', () => {
  expect(createStarterPlayer()).toEqual({
    location: 10, level: 1, availableStats: 5, coins: 20, team: 'good',
  });
});

it('keeps starting properties independent between players', () => {
  const first = createStarterPlayer();
  first.coins = 0;
  first.location = 23;

  const second = createStarterPlayer();
  expect(second).not.toBe(first);
  expect(second).toMatchObject({ coins: 20, location: 10 });
});
