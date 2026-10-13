/** @jest-environment node */
import { PlayerActionFastTravel, PlayerActionMove, PlayerActionRecruit, PlayerActionType } from '@/lib/store/types';
import { createMonster, createNpc, createParams, createPlayer } from '../test-support/fixtures';
import { getNpcActions } from '../game-npc-actions';
import { actionNpcRecruit, actionNpcTravel } from './npc-actions';
import { getNpcOptions, planNpcTurn } from './npc-strategy';
import { getMonsterCost } from './recruit-helper';
import { DEFAULT_TEAM_STATE, getState, saveState, TeamStateDef } from './territory-state';

jest.mock('@/lib/games/maps/warlords-of-fire', () => ({ warlordsOfFire: { locations: Array.from({ length: 8 }, (_, index) => ({
  id: index + 1, description: 'Road', move: [
    ...(index > 0 ? [{ id: index, direction: 'w' }] : []),
    ...(index < 7 ? [{ id: index + 2, direction: 'e' }] : []),
  ],
})) } }));
jest.mock('../game-npc-actions', () => ({ getNpcActions: jest.fn(() => ({ actions: [] })) }));

function scenario() {
  const params = createParams();
  params.gameState.players = [];
  const npc = createNpc({ team: 'npc', scriptedActions: true });
  params.gameState.npcs = [npc];
  const team: TeamStateDef = { ...DEFAULT_TEAM_STATE, territory: [1, 2, 3, 4, 5, 6, 7], monsters: ['orc'], coins: 100 };
  saveState(params.gameState, { teams: { npc: team } });
  return { params, npc, team };
}

afterEach(() => jest.restoreAllMocks());

it('continues a reinforcement plan over multiple runs, then recruits and spends its team coins', () => {
  const { params, npc, team } = scenario();
  team.npcDecision = { type: 'reinforce', location: 7, recruits: ['orc', 'orc'] };
  const first = planNpcTurn(params, npc, team)!.actions[0] as PlayerActionFastTravel;
  expect(first).toMatchObject({ type: PlayerActionType.FastTravel, targetLocation: 6 });
  actionNpcTravel(params, npc, first);
  const second = planNpcTurn(params, npc, team)!.actions[0] as PlayerActionFastTravel;
  expect(second.targetLocation).toBe(7);
  actionNpcTravel(params, npc, second);
  const recruit = planNpcTurn(params, npc, team)!.actions[0] as PlayerActionRecruit;
  expect(recruit.type).toBe(PlayerActionType.Recruit);
  actionNpcRecruit(params, npc, recruit);
  expect(params.monsters).toHaveLength(2);
  expect(params.monsters.every(monster => monster.team === npc.id && monster.location === 7 && monster.scriptedActions)).toBe(true);
  expect(getState(params.gameState).teams.npc.coins).toBe(100 - 2 * getMonsterCost('orc'));
  expect(team.npcDecision).toBeUndefined();
});

it.each(['enemy', 'blocked', 'lost'])('revalidates a run before execution if its route becomes %s', problem => {
  const { params, npc, team } = scenario();
  team.npcDecision = { type: 'reinforce', location: 7, recruits: ['orc'] };
  const run = planNpcTurn(params, npc, team)!.actions[0] as PlayerActionFastTravel;
  if (problem === 'enemy') params.monsters.push(createMonster({ location: 3 }));
  if (problem === 'blocked') params.blockedMoves.push({ location: 3, direction: 'e', description: 'Closed' });
  if (problem === 'lost') team.territory = team.territory.filter(location => location !== 3);
  actionNpcTravel(params, npc, run);
  expect(npc.location.id).toBe(1);
});

it('uses the combat fallback and preserves its goal while live enemies are present', () => {
  const { params, npc, team } = scenario();
  team.npcDecision = { type: 'reinforce', location: 7, recruits: ['orc'] };
  params.monsters.push(createMonster());
  expect(planNpcTurn(params, npc, team)).toBeNull();
  expect(team.npcDecision.type).toBe('reinforce');
});

it('gathers local monsters into an invasion party, then retreats to its origin when overwhelmed', () => {
  const { params, npc, team } = scenario();
  npc.location.id = 2;
  npc.health = 2;
  team.territory = [1, 2];
  team.npcDecision = { type: 'expand', from: 2, location: 3 };
  const ally = createMonster({ id: 'ally', type: 'orc', health: 14, team: npc.id, location: 2 });
  params.monsters = [ally, createMonster({ id: 'enemy', location: 3 })];
  const move = planNpcTurn(params, npc, team)!.actions[0] as PlayerActionMove;
  expect(ally.masterId).toBe(npc.id);
  actionNpcTravel(params, npc, move);
  ally.location = 3;
  params.monsters.push(createMonster({ id: 'dragon', type: 'dragon', health: 60, location: 3 }));
  const retreat = planNpcTurn(params, npc, team)!.actions[0] as PlayerActionMove;
  expect(retreat).toMatchObject({ type: PlayerActionType.Move, direction: 'w' });
  expect(team.npcDecision).toEqual({ type: 'retreat', location: 2 });
  actionNpcTravel(params, npc, retreat);
  expect(npc.location.id).toBe(2);
});

it('gives expansion a greater relative weight early in the game', () => {
  const { params, npc, team } = scenario();
  team.territory = [1];
  const expansionWeight = () => getNpcOptions(params, npc, team)
    .filter(option => option.decision?.type === 'expand')
    .reduce((weight, option) => weight + option.benefit / option.cost, 0);
  params.gameState.turn = 0;
  const early = expansionWeight();
  params.gameState.turn = 100;
  expect(early).toBeGreaterThan(expansionWeight() * 3);
});

it('can choose to stay and use recovery actions when no affordable travel or reinforcement is available', () => {
  const { params, npc, team } = scenario();
  team.coins = 0;
  params.blockedMoves.push({ location: 1, direction: 'e', description: 'Closed' });
  jest.mocked(getNpcActions).mockReturnValueOnce({ actions: [] });
  expect(planNpcTurn(params, npc, team)).toEqual({ actions: [] });
  expect(team.npcDecision).toBeUndefined();
});

it('cannot recruit past the available funds or recruit during combat', () => {
  const { params, npc, team } = scenario();
  const recruit: PlayerActionRecruit = { id: 1, type: PlayerActionType.Recruit, monsters: ['orc', 'orc'], description: '' };
  team.coins = getMonsterCost('orc');
  actionNpcRecruit(params, npc, recruit);
  expect(params.monsters).toHaveLength(1);
  expect(team.coins).toBe(0);
  team.coins = 100;
  params.monsters.push(createMonster({ id: 'enemy' }));
  actionNpcRecruit(params, npc, recruit);
  expect(params.monsters).toHaveLength(2);
  expect(team.coins).toBe(100);
});

it('lets an independent sub-commander recruit using the player-led faction pool and available funds', () => {
  const { params, npc, team } = scenario();
  npc.team = 'leader';
  const leader = createPlayer({ id: 'leader', team: 'leader', coins: getMonsterCost('orc') });
  params.gameState.players = [leader];
  const state = getState(params.gameState);
  state.teams.leader = { ...DEFAULT_TEAM_STATE, territory: [1], monsters: ['orc'], coins: 0 };
  team.territory = [];
  team.monsters = [];
  team.npcDecision = { type: 'reinforce', location: 1, recruits: ['orc', 'orc'] };
  saveState(params.gameState, state);
  actionNpcRecruit(params, npc, { id: 1, type: PlayerActionType.Recruit, monsters: ['orc', 'orc'], description: '' });
  expect(params.monsters).toHaveLength(1);
  expect(params.monsters[0].team).toBe(leader.team);
  expect(leader.coins).toBe(0);
  expect(team.npcDecision).toBeUndefined();
});
