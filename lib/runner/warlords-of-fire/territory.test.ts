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
