/** @jest-environment node */
import { setupProcesses, initialiseProcessesForTurn, executeProcessesForTurn, executeProcessesBetweenTurns } from './game-processes';
import { cauldronOfFireProcesses } from './cauldron-of-fire/processes';
import { createParams } from './test-support/fixtures';

jest.mock('./cauldron-of-fire/processes', () => ({ cauldronOfFireProcesses: {
  setup: jest.fn(), initialiseForTurn: jest.fn(), executeForTurn: jest.fn(), executeBetweenTurns: jest.fn(),
} }));

it.each([
  [setupProcesses, 'setup'], [initialiseProcessesForTurn, 'initialiseForTurn'],
  [executeProcessesForTurn, 'executeForTurn'], [executeProcessesBetweenTurns, 'executeBetweenTurns'],
] as const)('routes the %s lifecycle hook only for supported games', async (run, hook) => {
  const params = createParams();
  await run(params);
  expect(cauldronOfFireProcesses[hook]).not.toHaveBeenCalled();
  params.gameState.gameId = 'cauldronfire';
  await run(params);
  expect(cauldronOfFireProcesses[hook]).toHaveBeenCalledWith(params);
});
