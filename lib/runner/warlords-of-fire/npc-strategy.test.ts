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
  params.monsters = [createMonster({ type: 'dragon', health: 60, location: 8 })];
  const first = planNpcTurn(params, npc, team)!.actions[0] as PlayerActionFastTravel;
  expect(first).toMatchObject({ type: PlayerActionType.FastTravel, targetLocation: 6 });
  actionNpcTravel(params, npc, first);
  const second = planNpcTurn(params, npc, team)!.actions[0] as PlayerActionFastTravel;
  expect(second.targetLocation).toBe(7);
  actionNpcTravel(params, npc, second);
  const recruit = planNpcTurn(params, npc, team)!.actions[0] as PlayerActionRecruit;
  expect(recruit.type).toBe(PlayerActionType.Recruit);
  actionNpcRecruit(params, npc, recruit);
  const recruits = params.monsters.filter(monster => monster.team === npc.id);
  expect(recruits).toHaveLength(2);
  expect(recruits.every(monster => monster.location === 7 && monster.scriptedActions && !monster.masterId)).toBe(true);
  expect(getState(params.gameState).teams.npc.coins).toBe(100 - 2 * getMonsterCost('orc'));
  expect(team.npcDecision).toBeUndefined();
});

it.each(['enemy', 'blocked', 'lost'])('revalidates a run before execution if its route becomes %s', problem => {
  const { params, npc, team } = scenario();
  params.monsters = [createMonster({ location: 8 })];
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
  npc.health = 8;
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
  state.teams.leader = { ...DEFAULT_TEAM_STATE, territory: [1], monsters: ['orc'], coins: getMonsterCost('orc') };
  team.territory = [];
  team.monsters = [];
  team.npcDecision = { type: 'reinforce', location: 1, recruits: ['orc', 'orc'] };
  saveState(params.gameState, state);
  actionNpcRecruit(params, npc, { id: 1, type: PlayerActionType.Recruit, monsters: ['orc', 'orc'], description: '' });
  expect(params.monsters).toHaveLength(1);
  expect(params.monsters[0].team).toBe(leader.team);
  expect(leader.coins).toBe(getMonsterCost('orc'));
  expect(state.teams.leader.coins).toBe(0);
  expect(team.npcDecision).toBeUndefined();
  actionNpcRecruit(params, npc, { id: 2, type: PlayerActionType.Recruit, monsters: ['orc'], description: '' });
  expect(params.monsters).toHaveLength(1);
  expect(leader.coins).toBe(getMonsterCost('orc'));
});

it('offers party recruitment when the current force is too weak to invade', () => {
  const { params, npc, team } = scenario();
  npc.health = 8;
  team.territory = [1];
  params.monsters = [createMonster({ type: 'orc', health: 14, location: 2 })];
  const decisions = getNpcOptions(params, npc, team).map(option => option.decision);
  expect(decisions).not.toContainEqual({ type: 'expand', from: 1, location: 2 });
  expect(decisions).toContainEqual({ type: 'prepare', from: 1, location: 2, recruits: ['orc'] });
});

it.each(['leader', 'sub-commander'])('lets a %s recruit an invasion party and resume expansion with the new monsters', role => {
  const { params, npc, team } = scenario();
  npc.health = 8;
  team.territory = [1];
  team.npcDecision = { type: 'prepare', from: 1, location: 2, recruits: ['orc'] };
  let faction = team;
  if (role === 'sub-commander') {
    npc.team = 'leader';
    params.gameState.players = [createPlayer({ id: 'leader', team: 'leader', coins: 500 })];
    const state = getState(params.gameState);
    faction = { ...DEFAULT_TEAM_STATE, territory: [1], coins: 100 };
    state.teams.leader = faction;
    team.territory = [];
    team.coins = 0;
    saveState(params.gameState, state);
  }
  const command = () => ({ ...faction, npcDecision: team.npcDecision });
  params.monsters = [createMonster({ type: 'orc', health: 14, location: 2 })];
  const recruit = planNpcTurn(params, npc, command())!.actions[0] as PlayerActionRecruit;
  expect(recruit).toMatchObject({ type: PlayerActionType.Recruit, monsters: ['orc'] });
  actionNpcRecruit(params, npc, recruit);
  expect(params.monsters[1]).toMatchObject({ team: npc.team, masterId: npc.id, location: 1, scriptedActions: true });
  expect(faction.coins).toBe(100 - getMonsterCost('orc'));
  expect(team.npcDecision).toEqual({ type: 'expand', from: 1, location: 2 });
  expect(planNpcTurn(params, npc, command())!.actions[0]).toMatchObject({ type: PlayerActionType.Move, direction: 'e' });
  if (role === 'sub-commander') expect(params.gameState.players[0].coins).toBe(500);
});

it('gathers a travelling party even when expanding into an empty location', () => {
  const { params, npc, team } = scenario();
  team.territory = [1];
  team.npcDecision = { type: 'expand', from: 1, location: 2 };
  const ally = createMonster({ type: 'orc', health: 14, team: npc.team });
  params.monsters = [ally];
  expect(planNpcTurn(params, npc, team)!.actions[0]).toMatchObject({ type: PlayerActionType.Move, direction: 'e' });
  expect(ally.masterId).toBe(npc.id);
});

it('keeps a garrison to protect against another enemy while expanding', () => {
  const { params, npc, team } = scenario();
  npc.location.id = 2;
  team.territory = [2];
  team.npcDecision = { type: 'expand', from: 2, location: 3 };
  const garrison = createMonster({ type: 'orc', health: 14, team: npc.team, location: 2 });
  params.monsters = [garrison, createMonster({ id: 'enemy', location: 1 })];
  expect(planNpcTurn(params, npc, team)!.actions[0]).toMatchObject({ type: PlayerActionType.Move, direction: 'e' });
  expect(garrison.masterId).toBeUndefined();
});

it('counts its travelling party when considering an invasion from a distant frontier', () => {
  const { params, npc, team } = scenario();
  npc.health = 8;
  team.territory = [1, 2];
  params.monsters = [
    createMonster({ type: 'orc', health: 14, team: npc.team, masterId: npc.id }),
    createMonster({ id: 'enemy', type: 'orc', health: 14, location: 3 }),
  ];
  expect(getNpcOptions(params, npc, team).map(option => option.decision))
    .toContainEqual({ type: 'expand', from: 2, location: 3 });
});

it('does not count another commander\'s party as invasion troops', () => {
  const { params, npc, team } = scenario();
  npc.health = 8;
  team.territory = [1];
  params.monsters = [
    createMonster({ type: 'orc', health: 14, team: npc.team, masterId: 'other-commander' }),
    createMonster({ id: 'enemy', type: 'orc', health: 14, location: 2 }),
  ];
  expect(getNpcOptions(params, npc, team).map(option => option.decision))
    .not.toContainEqual({ type: 'expand', from: 1, location: 2 });
  expect(params.monsters[0].masterId).toBe('other-commander');
});

it('reinforces threatened territory without spending on safe interior locations', () => {
  const { params, npc, team } = scenario();
  expect(getNpcOptions(params, npc, team).filter(option => option.decision?.type === 'reinforce')).toEqual([]);
  params.monsters = [createMonster({ location: 8 })];
  const reinforcements = getNpcOptions(params, npc, team).filter(option => option.decision?.type === 'reinforce');
  expect(reinforcements.length).toBeGreaterThan(0);
  expect(reinforcements.every(option => option.decision?.location === 7)).toBe(true);
});

it('moves its existing party to defend territory without needing coins', () => {
  const { params, npc, team } = scenario();
  team.coins = 0;
  team.npcDecision = { type: 'defend', location: 7 };
  const party = createMonster({ type: 'orc', health: 14, team: npc.team, masterId: npc.id });
  params.monsters = [party, createMonster({ id: 'enemy', location: 8 })];
  params.blockedMoves = [{ location: 7, direction: 'e', description: 'Closed' }];
  const first = planNpcTurn(params, npc, team)!.actions[0] as PlayerActionFastTravel;
  actionNpcTravel(params, npc, first);
  party.location = npc.location.id;
  const second = planNpcTurn(params, npc, team)!.actions[0] as PlayerActionFastTravel;
  actionNpcTravel(params, npc, second);
  party.location = npc.location.id;
  planNpcTurn(params, npc, team);
  expect(npc.location.id).toBe(7);
  expect(party.masterId).toBeUndefined();
  expect(team.coins).toBe(0);
});

it('abandons recruitment when existing troops can already support the invasion', () => {
  const { params, npc, team } = scenario();
  team.territory = [1];
  team.npcDecision = { type: 'prepare', from: 1, location: 2, recruits: ['orc'] };
  params.monsters = [createMonster({ type: 'orc', health: 14, team: npc.team, masterId: npc.id })];
  expect(planNpcTurn(params, npc, team)!.actions[0].type).toBe(PlayerActionType.Move);
  expect(team.npcDecision).toEqual({ type: 'expand', from: 1, location: 2 });
  expect(team.coins).toBe(100);
});

it('recovers before resuming an invasion after defeat', () => {
  const { params, npc, team } = scenario();
  npc.health = 1;
  team.npcDecision = { type: 'expand', from: 1, location: 8 };
  expect(planNpcTurn(params, npc, team)).toEqual({ actions: [] });
  expect(team.npcDecision.type).toBe('expand');
});

it('chooses another goal when a teammate has reserved its expansion target', () => {
  const { params, npc, team } = scenario();
  team.npcDecision = { type: 'expand', from: 7, location: 8 };
  expect(planNpcTurn(params, npc, team, new Set([8]))).toEqual({ actions: [] });
  expect(team.npcDecision).toBeUndefined();
});

it('abandons a reinforcement journey when the threat has disappeared', () => {
  const { params, npc, team } = scenario();
  team.coins = 0;
  team.npcDecision = { type: 'reinforce', location: 7, recruits: ['orc'] };
  jest.spyOn(Math, 'random').mockReturnValue(0);
  expect(planNpcTurn(params, npc, team)!.actions[0]).toMatchObject({ type: PlayerActionType.FastTravel, targetLocation: 6 });
  expect(team.npcDecision).toEqual({ type: 'expand', from: 7, location: 8 });
});

it('guards a threatened border when it cannot recruit or counter-attack', () => {
  const { params, npc, team } = scenario();
  npc.location.id = 7;
  team.coins = 0;
  params.monsters = [createMonster({ location: 8 })];
  params.blockedMoves = [{ location: 7, direction: 'e', description: 'Closed' }];
  expect(planNpcTurn(params, npc, team)).toEqual({ actions: [] });
  expect(team.npcDecision).toEqual({ type: 'defend', location: 7 });
});
