/** @jest-environment node */
import { publishPlayVideo } from '@/lib/messages/message-videos';
import { VideoNames } from '@/lib/messages/video-list';
import { createGame, createMonster, createNpc, createParams, createPlayer } from '../test-support/fixtures';
import { DEFAULT_TEAM_STATE, getState, saveState } from './territory-state';
import { territoryProcesses } from './territory';

jest.mock('@/lib/messages/message-videos', () => ({ publishPlayVideo: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

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

function createVictoryParams(playerId = 'witch', territoryCount = 4) {
  const params = createParams({ gameState: createGame({ players: [
    createPlayer({ id: playerId, team: playerId }),
    createPlayer({ id: 'enemy', team: 'enemy', location: { id: 10, description: '', move: [] } }),
    createPlayer({ id: 'other', team: 'other', location: { id: 20, description: '', move: [] } }),
  ] }) });
  saveState(params.gameState, { teams: {
    [playerId]: { ...DEFAULT_TEAM_STATE, territory: Array.from({ length: territoryCount }, (_, i) => i + 1) },
    enemy: { ...DEFAULT_TEAM_STATE, territory: [10] },
    other: { ...DEFAULT_TEAM_STATE, territory: [20] },
  } });
  return params;
}

it.each([3, 4, 5])('compares %s territories against twice all other teams combined', async territoryCount => {
  const params = createVictoryParams('witch', territoryCount);
  await territoryProcesses.executeForTurn!(params);

  if (territoryCount < 4) {
    expect(getState(params.gameState).winner).toBeUndefined();
    expect(publishPlayVideo).not.toHaveBeenCalled();
    expect(params.messages.witch.messages.some(message => message.text.includes('won the game'))).toBe(false);
  } else {
    expect(getState(params.gameState).winner).toBe('witch');
    expect(params.messages.witch.messages).toContainEqual({ text:
      '***You have won the game!*** Your team controls at least twice as much territory as all other teams combined.' });
    for (const id of ['enemy', 'other']) {
      expect(params.messages[id].messages).toContainEqual({ text:
        '***You have lost the game!*** **Test Hero** has won with at least twice as much territory as all other teams combined.' });
    }
    expect(publishPlayVideo).toHaveBeenCalledWith('board', 'map', VideoNames.witchWarlordsWin);
  }
});

it.each([
  ['witch', VideoNames.witchWarlordsWin],
  ['ranger', VideoNames.rangerWarlordsWin],
  ['mage', VideoNames.mageWarlordsWin],
  ['barbarian', VideoNames.barbarianWarlordsWin],
])('plays the %s victory video and announces the result only once', async (playerId, video) => {
  const params = createVictoryParams(playerId);
  await territoryProcesses.executeForTurn!(params);
  await territoryProcesses.executeForTurn!(params);

  expect(publishPlayVideo).toHaveBeenCalledTimes(1);
  expect(publishPlayVideo).toHaveBeenCalledWith('board', 'map', video);
  expect(params.messages[playerId].messages.filter(message => message.text.includes('won the game'))).toHaveLength(1);
  expect(params.messages.enemy.messages.filter(message => message.text.includes('lost the game'))).toHaveLength(1);
});

it('plays defeat for an NPC faction and names its leader rather than a sub-commander', async () => {
  const params = createVictoryParams('ranger');
  params.gameState.players = params.gameState.players.filter(player => player.id !== 'ranger');
  params.gameState.npcs = [
    createNpc({ id: 'sub', team: 'warlord', name: 'Sub-commander', location: { id: 2, description: '', move: [] } }),
    createNpc({ id: 'warlord', team: 'warlord', name: 'NPC Leader' }),
  ];
  const state = getState(params.gameState);
  state.teams.warlord = state.teams.ranger;
  delete state.teams.ranger;
  saveState(params.gameState, state);

  await territoryProcesses.executeForTurn!(params);

  expect(getState(params.gameState).winner).toBe('warlord');
  for (const id of ['enemy', 'other']) {
    expect(params.messages[id].messages).toContainEqual({ text:
      '***You have lost the game!*** **NPC Leader** has won with at least twice as much territory as all other teams combined.' });
  }
  expect(publishPlayVideo).toHaveBeenCalledWith('board', 'map', VideoNames.warlordsDefeat);
});

it('checks victory after transferring conquered territory', async () => {
  const params = createVictoryParams('witch', 2);
  const state = getState(params.gameState);
  state.teams.conquered = { ...DEFAULT_TEAM_STATE, territory: [3, 4], conqueredBy: 'witch' };
  saveState(params.gameState, state);

  await territoryProcesses.executeForTurn!(params);

  expect(getState(params.gameState).winner).toBe('witch');
  expect(publishPlayVideo).toHaveBeenCalledWith('board', 'map', VideoNames.witchWarlordsWin);
});

it.each([0, 1])('requires positive territory when all other teams have none (territories %s)', async territoryCount => {
  const params = createParams({ gameState: createGame({ players: [
    createPlayer({ id: 'mage', team: 'mage', health: 0 }),
  ] }) });
  saveState(params.gameState, { teams: {
    mage: { ...DEFAULT_TEAM_STATE, territory: territoryCount ? [1] : [] },
    other: { ...DEFAULT_TEAM_STATE, territory: [] },
  } });

  await territoryProcesses.executeForTurn!(params);

  expect(getState(params.gameState).winner).toBe(territoryCount ? 'mage' : undefined);
  expect(publishPlayVideo).toHaveBeenCalledTimes(territoryCount);
});
