/** @jest-environment node */
import { cauldronOfFireProcesses } from './processes';
import { keyProcess } from './key-processes';
import { lichKing } from './lich-king';
import { dragons } from './dragons';
import { createParams } from '../test-support/fixtures';

jest.mock('./key-processes', () => ({ keyProcess: { setup: jest.fn(), initialiseForTurn: jest.fn(), executeForTurn: jest.fn(), executeBetweenTurns: jest.fn() } }));
jest.mock('./lich-king', () => ({ lichKing: { setup: jest.fn(), initialiseForTurn: jest.fn(), executeForTurn: jest.fn(), executeBetweenTurns: jest.fn() } }));
jest.mock('./dragons', () => ({ dragons: { setup: jest.fn(), initialiseForTurn: jest.fn(), executeForTurn: jest.fn(), executeBetweenTurns: jest.fn() } }));
jest.mock('./npcs', () => ({ npcs: {} }));
jest.mock('./zombies', () => ({ zombies: {} }));
jest.mock('./invasions', () => ({ invasions: {} }));
afterEach(() => jest.restoreAllMocks());

it.each(['setup', 'initialiseForTurn', 'executeForTurn', 'executeBetweenTurns'] as const)(
  'runs %s hooks in order and continues after an individual process fails', async hook => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const calls: string[] = [];
    jest.mocked(keyProcess[hook]!).mockImplementation(async () => { calls.push('keys'); throw new Error('failed'); });
    jest.mocked(lichKing[hook]!).mockImplementation(async () => { calls.push('lich'); });
    jest.mocked(dragons[hook]!).mockImplementation(async () => { calls.push('dragons'); });
    const params = createParams();
    await cauldronOfFireProcesses[hook]!(params);
    expect(calls).toEqual(['keys', 'lich', 'dragons']);
    expect(dragons[hook]).toHaveBeenCalledWith(params);
    expect(console.error).toHaveBeenCalledTimes(1);
  },
);
