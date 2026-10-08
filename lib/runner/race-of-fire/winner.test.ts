/** @jest-environment node */
import { winnerProcess } from './winner';
import { getState, saveState } from './race-state';
import { createGame, createParams } from '../test-support/fixtures';

jest.mock('@/lib/messages/message-videos', () => ({
  publishPreloadVideo: jest.fn(), publishPlayVideo: jest.fn(),
}));

it.each(['blue', 'red', null] as const)('applies and consumes the team instruction %s', async team => {
  const params = createParams({
    gameState: createGame({ gameId: 'racefire' }), playerInstructions: { hero: { team } },
  });
  saveState(params.gameState, { blueTeam: ['hero', 'friend'], redTeam: ['hero', 'enemy'] });

  await winnerProcess.initialiseForTurn!(params);

  expect(getState(params.gameState)).toEqual({
    blueTeam: team === 'blue' ? ['friend', 'hero'] : ['friend'],
    redTeam: team === 'red' ? ['enemy', 'hero'] : ['enemy'],
  });
  expect(params.playerInstructions).toEqual({});

  saveState(params.gameState, { blueTeam: [], redTeam: [] });
  await winnerProcess.initialiseForTurn!(params);
  expect(getState(params.gameState)).toEqual({ blueTeam: [], redTeam: [] });
});

it('keeps instructions that have not been processed', async () => {
  const params = createParams({ playerInstructions: {
    hero: { team: 'red', other: 'keep' }, other: { pending: true }, empty: {},
  } });

  await winnerProcess.initialiseForTurn!(params);

  expect(getState(params.gameState).redTeam).toEqual(['hero']);
  expect(params.playerInstructions).toEqual({ hero: { other: 'keep' }, other: { pending: true }, empty: {} });
});
