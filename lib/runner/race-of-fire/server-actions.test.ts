import { getPlayerRaceTeams, setPlayerRaceTeam } from './server-actions';
import { getGameStateFromRedis, getPlayersInstructionsFromRedis, lockPlayerActionsInRedis, setPlayerInstructionsInRedis } from '@/lib/store/redis-access';
import { publishMessage } from '@/lib/messages/message-publisher';
import { GameTopicMessageType } from '@/lib/message-types';
import { makeGameState, makePlayer } from '@/app/[boardId]/[mapId]/game/test-fixtures';

jest.mock('@/lib/store/redis-access', () => ({
  getGameStateFromRedis: jest.fn(), getPlayersInstructionsFromRedis: jest.fn(),
  lockPlayerActionsInRedis: jest.fn(), setPlayerInstructionsInRedis: jest.fn(),
}));
jest.mock('@/lib/messages/message-publisher', () => ({ publishMessage: jest.fn() }));

const release = jest.fn<Promise<void>, []>();

beforeEach(() => {
  jest.resetAllMocks();
  release.mockResolvedValue();
  jest.mocked(lockPlayerActionsInRedis).mockResolvedValue(release);
  jest.mocked(getPlayersInstructionsFromRedis).mockResolvedValue({});
});

it('returns saved selections, including explicit no team, with persisted teams as a fallback', async () => {
  jest.mocked(getGameStateFromRedis).mockResolvedValue(makeGameState({
    gameId: 'racefire',
    players: ['warrior', 'mage', 'ranger', 'witch'].map(id => makePlayer({ id })),
    processState: { 'crystal-shard': { blueTeam: ['warrior', 'mage'], redTeam: ['ranger'] } },
  }));
  jest.mocked(getPlayersInstructionsFromRedis).mockResolvedValue({
    warrior: { team: 'red' }, mage: { team: null }, ranger: {}, witch: {},
  });

  await expect(getPlayerRaceTeams('board', 'map')).resolves.toEqual({
    success: true, data: { warrior: 'red', mage: null, ranger: 'red', witch: null },
  });
  expect(getPlayersInstructionsFromRedis).toHaveBeenCalledTimes(1);
  expect(getPlayersInstructionsFromRedis).toHaveBeenCalledWith('board', 'map', ['warrior', 'mage', 'ranger', 'witch']);
});

it('reports read failures', async () => {
  jest.mocked(getGameStateFromRedis).mockRejectedValue(new Error('Read failed'));
  await expect(getPlayerRaceTeams('board', 'map')).resolves.toEqual({ success: false, error: 'Read failed' });
});

it('publishes only after saving the team and releases the player lock', async () => {
  const instructions = { team: 'blue', other: 'keep' } as const;
  await expect(setPlayerRaceTeam('board', 'map', 'warrior', instructions)).resolves.toEqual({
    success: true, data: instructions,
  });
  expect(setPlayerInstructionsInRedis).toHaveBeenCalledWith('board', 'map', 'warrior', instructions);
  expect(publishMessage).toHaveBeenCalledWith('board', 'map', {
    type: GameTopicMessageType.RaceTeamUpdated, playerId: 'warrior', team: 'blue',
  });
  expect(jest.mocked(setPlayerInstructionsInRedis).mock.invocationCallOrder[0])
    .toBeLessThan(jest.mocked(publishMessage).mock.invocationCallOrder[0]);
  expect(release).toHaveBeenCalledTimes(1);
});

it('does not publish an unsuccessful save', async () => {
  jest.mocked(setPlayerInstructionsInRedis).mockRejectedValue(new Error('Write failed'));
  await expect(setPlayerRaceTeam('board', 'map', 'warrior', { team: null })).resolves.toEqual({
    success: false, error: 'Write failed',
  });
  expect(publishMessage).not.toHaveBeenCalled();
  expect(release).toHaveBeenCalledTimes(1);
});

it('keeps a saved selection successful if publishing fails', async () => {
  jest.mocked(publishMessage).mockRejectedValue(new Error('Offline'));
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    await expect(setPlayerRaceTeam('board', 'map', 'warrior', { team: 'red' })).resolves.toEqual({
      success: true, data: { team: 'red' },
    });
    expect(release).toHaveBeenCalledTimes(1);
  } finally {
    log.mockRestore();
  }
});
