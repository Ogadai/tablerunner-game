/** @jest-environment node */
import { createMonster, createNpc, createParams } from '../test-support/fixtures';
import { DEFAULT_TEAM_STATE, getState, saveState } from './territory-state';
import { territoryProcesses } from './territory';

it.each([0, 5])('only claims territory after live enemy monsters are defeated (health %s)', async health => {
  const npc = createNpc({ team: 'npc' });
  const params = createParams({ monsters: [createMonster({ health })] });
  params.gameState.players = [];
  params.gameState.npcs = [npc, createNpc({ id: 'dead', team: 'other', health: 0 })];
  saveState(params.gameState, { teams: {
    npc: { ...DEFAULT_TEAM_STATE, territory: [], monsters: [] },
    other: { ...DEFAULT_TEAM_STATE, territory: [1], monsters: [] },
  } });
  await territoryProcesses.executeForTurn!(params);
  const state = getState(params.gameState);
  expect(state.teams.npc.territory).toEqual(health > 0 ? [] : [1]);
  expect(state.teams.other.territory).toEqual(health > 0 ? [1] : []);
  expect(state.teams.other.coins).toBe(0);
});

it('transfers simultaneous conquests to the final faction and pays its income once', async () => {
  const params = createParams();
  params.gameState.players = [];
  params.gameState.npcs = [
    createNpc({ id: 'first', team: 'first', scriptedActions: true }),
    createNpc({ id: 'second', team: 'second', scriptedActions: true }),
    createNpc({ id: 'winner', team: 'winner', scriptedActions: true }),
  ];
  const army = createMonster({ team: 'first', masterId: 'first' });
  params.monsters = [army];
  saveState(params.gameState, { teams: {
    first: { ...DEFAULT_TEAM_STATE, territory: [2], monsters: ['orc'], coins: 30, conqueredBy: 'second' },
    second: { ...DEFAULT_TEAM_STATE, territory: [3], monsters: ['troll'], coins: 50, conqueredBy: 'winner' },
    winner: { ...DEFAULT_TEAM_STATE, territory: [4], monsters: ['rat'], coins: 100 },
  } });
  await territoryProcesses.executeForTurn!(params);
  const state = getState(params.gameState);
  expect(state.teams.winner).toMatchObject({ territory: [4, 2, 3, 1], monsters: ['rat', 'orc', 'troll'], coins: 220 });
  expect(state.teams.first).toMatchObject({ territory: [], monsters: [], coins: 0 });
  expect(state.teams.second).toMatchObject({ territory: [], monsters: [], coins: 0 });
  expect(params.gameState.npcs.map(npc => npc.team)).toEqual(['winner', 'winner', 'winner']);
  expect(army).toMatchObject({ team: 'winner', masterId: 'first' });

  // Transfers finish this turn; a captured commander can retain a new multi-turn goal.
  state.teams.first.npcDecision = { type: 'expand', from: 1, location: 5 };
  await territoryProcesses.executeForTurn!(params);
  expect(getState(params.gameState).teams.first.npcDecision).toEqual({ type: 'expand', from: 1, location: 5 });
  expect(getState(params.gameState).teams.winner.coins).toBe(260);
});
