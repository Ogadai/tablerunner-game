/** @jest-environment node */
import { SpellIds, spells } from '@/lib/games/spells';
import { PlayerActionType } from '@/lib/store/types';
import { createMonster, createNpc, createParams, createPlayer } from '../test-support/fixtures';
import { actionAttack, monsterAttack } from '../game-action-attack';
import { actionCastSpell } from '../game-action-spell';
import { getAvailableSpellTargets } from '../spell-targets';
import { npcProcesses } from './npcs';
import { territoryProcesses } from './territory';
import { DEFAULT_TEAM_STATE, getState, saveState } from './territory-state';
import { getWarlordAvailableMonsters } from './recruit-helper';

jest.mock('@/lib/messages/message-videos', () => ({ publishPlayVideo: jest.fn() }));

function scenario() {
  const npc = createNpc({
    id: 'loser', team: 'loser', scriptedActions: true, deferDefeat: true, health: 1, startLocation: 4,
    location: { id: 1, description: '', move: [] },
    baseStats: { attack: 6, damage: 6, defence: 0, magic: 10, health: 20, speed: 10 },
  });
  const winner = createPlayer({
    id: 'winner', team: 'winner', coins: 200,
    baseStats: { attack: 100, damage: 100, defence: 100, magic: 100, health: 20, speed: 10 },
  });
  const params = createParams();
  params.gameState.gameId = 'warlordsfire';
  params.gameState.players = [winner];
  params.gameState.npcs = [npc];
  saveState(params.gameState, { teams: {
    loser: { ...DEFAULT_TEAM_STATE, territory: [4, 5], monsters: ['orc'], coins: 100,
      npcDecision: { type: 'expand', from: 1, location: 2 } },
    winner: { ...DEFAULT_TEAM_STATE, territory: [6], monsters: ['rat'], colour: 'FFFFFF' },
  } });
  return { params, npc, winner };
}

async function finishTurn(params: ReturnType<typeof createParams>) {
  await npcProcesses.executeForTurn!(params);
  await territoryProcesses.executeForTurn!(params);
}

beforeEach(() => jest.spyOn(Math, 'random').mockReturnValue(0.9));
afterEach(() => jest.restoreAllMocks());

it('respawns a warlord at its original start when no warlord survives locally, leaving its party behind', async () => {
  const { params, npc, winner } = scenario();
  winner.location.id = 6;
  const wild = createMonster();
  const party = createMonster({ id: 'party', team: npc.team, masterId: npc.id });
  params.monsters = [wild, party];
  monsterAttack(params, wild, npc);
  expect(npc.health).toBe(0);
  expect(getAvailableSpellTargets(params, { ...winner, location: npc.location }, spells[SpellIds.animateCorpse]))
    .not.toContain(npc);
  await npcProcesses.executeForTurn!(params);
  expect(npc).toMatchObject({ health: 1, team: 'loser', startLocation: 4, location: { id: 4 } });
  expect(npc.respawnTurns).toBeUndefined();
  expect(party.masterId).toBeUndefined();
  expect(getState(params.gameState).teams.loser.territory).toEqual([4, 5]);
  expect(getState(params.gameState).teams.loser.npcDecision).toBeUndefined();
});

it.each(['player', 'npc', 'army', 'wild monster', 'spell'])('transfers a defeated leader to the surviving faction after a %s attack', async attackerKind => {
  const { params, npc, winner } = scenario();
  const subordinate = createNpc({ id: 'sub', team: npc.team, scriptedActions: true,
    location: { id: 5, description: '', move: [] } });
  const secondSubordinate = createNpc({ id: 'second-sub', team: npc.team, scriptedActions: true,
    location: { id: 5, description: '', move: [] } });
  const army = createMonster({ id: 'army', team: npc.team, masterId: npc.id });
  const remote = createMonster({ id: 'remote', team: npc.team, location: 20, health: 0 });
  const subordinateArmy = createMonster({ id: 'sub-army', team: npc.team, masterId: subordinate.id, location: 5 });
  const garrison = createMonster({ id: 'garrison', team: npc.team, location: 20 });
  const unrelatedArmy = createMonster({ id: 'unrelated', team: 'other-team', location: 30 });
  params.gameState.npcs.push(subordinate, secondSubordinate);
  params.monsters = [army, remote, subordinateArmy, garrison, unrelatedArmy];
  if (attackerKind === 'army' || attackerKind === 'wild monster') {
    const attacker = createMonster({ id: 'attacker', team: attackerKind === 'army' ? winner.team : 'monster', type: 'dragon', health: 60 });
    params.monsters.push(attacker);
    monsterAttack(params, attacker, npc);
    // The surviving warlord determines the result even when a wild monster dealt the hit.
    if (attackerKind === 'wild monster') attacker.health = 0;
  } else if (attackerKind === 'spell') {
    winner.spells = [SpellIds.fireBall];
    actionCastSpell(params, winner, { id: 1, type: PlayerActionType.Cast, description: '', spellId: SpellIds.fireBall, targetId: npc.id });
  } else {
    const attacker = attackerKind === 'npc' ? createNpc({ id: 'captor', team: winner.team, scriptedActions: true,
      baseStats: winner.baseStats }) : winner;
    if (attackerKind === 'npc') params.gameState.npcs.push(attacker as ReturnType<typeof createNpc>);
    actionAttack(params, attacker, { id: 1, type: PlayerActionType.Attack, target: npc.id, description: '' });
  }
  expect(npc).toMatchObject({ health: 0, team: 'loser' });
  expect(army.team).toBe('loser');
  await finishTurn(params);
  expect(npc).toMatchObject({ health: 1, team: winner.team, masterId: null, location: { id: 1 } });
  expect(subordinate).toMatchObject({ team: winner.team, masterId: null, health: 20 });
  expect(secondSubordinate).toMatchObject({ team: winner.team, masterId: null, health: 20 });
  expect(army).toMatchObject({ team: winner.team, masterId: npc.id });
  expect(remote.team).toBe(winner.team);
  expect(subordinateArmy).toMatchObject({ team: winner.team, masterId: subordinate.id, location: 5 });
  expect(garrison.team).toBe(winner.team);
  expect(unrelatedArmy.team).toBe('other-team');
  const state = getState(params.gameState);
  expect(state.teams.winner.territory).toEqual([6, 4, 5, 1]);
  expect(state.teams.winner.monsters).toEqual(['rat']);
  expect(state.teams.loser).toMatchObject({ territory: [], monsters: ['orc'], coins: 0 });
  expect(getWarlordAvailableMonsters(params.gameState, winner.team!)).toEqual(expect.arrayContaining(['rat', 'orc']));
  expect(state.teams.loser.npcDecision).toBeUndefined();
  expect(state.teams.loser.conqueredBy).toBeUndefined();
  // Conquered treasury plus one income payment, despite multiple commanders.
  expect(winner.coins).toBe(304);
});

it('waits while multiple factions survive and captures the warlord once combat is settled', async () => {
  const { params, npc, winner } = scenario();
  const contender = createPlayer({ id: 'contender', team: 'third' });
  params.gameState.players.push(contender);
  actionAttack(params, winner, { id: 1, type: PlayerActionType.Attack, target: npc.id, description: '' });
  await finishTurn(params);
  expect(npc).toMatchObject({ health: 0, team: 'loser', location: { id: 1 } });
  expect(getState(params.gameState).teams.loser.territory).toEqual([4, 5]);
  expect(getState(params.gameState).teams.loser.coins).toBe(100);
  contender.health = 0;
  await finishTurn(params);
  expect(npc).toMatchObject({ health: 1, team: winner.team, masterId: null });
  expect(getState(params.gameState).teams.loser.territory).toEqual([]);
});

it('respawns a defeated warlord when its own faction is the only surviving faction', async () => {
  const { params, npc, winner } = scenario();
  winner.team = npc.team;
  npc.health = 0;
  await npcProcesses.executeForTurn!(params);
  expect(npc).toMatchObject({ health: 1, team: 'loser', location: { id: 4 } });
  expect(getState(params.gameState).teams.loser.conqueredBy).toBeUndefined();
});

it('reassigns a defeated sub-commander without transferring the former faction assets', async () => {
  const { params, npc, winner } = scenario();
  npc.team = 'old-leader';
  const leader = createNpc({ id: 'old-leader', team: 'old-leader', scriptedActions: true,
    location: { id: 3, description: '', move: [] } });
  const otherSubordinate = createNpc({ id: 'other-sub', team: leader.team, scriptedActions: true,
    location: { id: 3, description: '', move: [] } });
  params.gameState.npcs.push(leader, otherSubordinate);
  const army = createMonster({ team: 'old-leader', masterId: npc.id });
  const leaderArmy = createMonster({ id: 'leader-army', team: leader.team, masterId: leader.id, location: 3 });
  const otherSubordinateArmy = createMonster({ id: 'other-sub-army', team: leader.team, masterId: otherSubordinate.id, location: 3 });
  params.monsters = [army, leaderArmy, otherSubordinateArmy];
  const state = getState(params.gameState);
  state.teams['old-leader'] = { ...DEFAULT_TEAM_STATE, territory: [2, 3], monsters: ['troll'], coins: 70 };
  state.teams.loser.territory = [];
  saveState(params.gameState, state);
  actionAttack(params, winner, { id: 1, type: PlayerActionType.Attack, target: npc.id, description: '' });
  await finishTurn(params);
  expect(npc).toMatchObject({ health: 1, team: winner.team, masterId: null });
  expect(leader.team).toBe('old-leader');
  expect(otherSubordinate.team).toBe('old-leader');
  expect(army.team).toBe('old-leader');
  expect(army.masterId).toBeUndefined();
  expect(leaderArmy).toMatchObject({ team: 'old-leader', masterId: leader.id });
  expect(otherSubordinateArmy).toMatchObject({ team: 'old-leader', masterId: otherSubordinate.id });
  expect(getState(params.gameState).teams['old-leader']).toMatchObject({ territory: [2, 3], coins: 72 });
  expect(getState(params.gameState).teams.winner.territory).toEqual([6]);
  expect(winner.coins).toBe(201);
});

it.each(['player', 'sub-commander'])('notifies a remote previous master when their sub-commander is captured by a %s', async captorKind => {
  const { params, npc, winner } = scenario();
  const previousMaster = createPlayer({ id: 'previous-master', team: 'old-team',
    location: { id: 3, description: '', move: [] } });
  params.gameState.players.push(previousMaster);
  params.messages[previousMaster.id] = { messages: [] };
  npc.team = previousMaster.team;
  npc.name = 'Captured Warlord';
  winner.name = 'New Master';
  if (captorKind === 'sub-commander') {
    params.gameState.npcs.push(createNpc({ id: 'captor', team: winner.team, name: 'Capturing Commander', scriptedActions: true }));
    winner.location.id = 6;
  }
  npc.health = 0;
  const contender = createPlayer({ id: 'contender', team: 'third' });
  params.gameState.players.push(contender);

  await npcProcesses.executeForTurn!(params);
  expect(params.messages[previousMaster.id].messages).toEqual([]);
  expect(npc.team).toBe(previousMaster.team);

  contender.health = 0;
  await npcProcesses.executeForTurn!(params);
  expect(npc.team).toBe(winner.team);
  expect(params.messages[previousMaster.id].messages).toEqual([
    { text: '*Your* sub-commander **Captured Warlord** was defeated by **New Master** and joined their faction' },
  ]);

  await npcProcesses.executeForTurn!(params);
  expect(params.messages[previousMaster.id].messages).toHaveLength(1);
});

it('adds conquered assets and income to an NPC-led winning faction', async () => {
  const { params, npc, winner } = scenario();
  const captor = createNpc({ id: 'captor', team: 'captor', scriptedActions: true, baseStats: winner.baseStats });
  params.gameState.players = [];
  params.gameState.npcs.push(captor);
  const state = getState(params.gameState);
  state.teams.captor = { ...DEFAULT_TEAM_STATE, territory: [6], monsters: ['troll'], coins: 30 };
  saveState(params.gameState, state);
  actionAttack(params, captor, { id: 1, type: PlayerActionType.Attack, target: npc.id, description: '' });
  await finishTurn(params);
  expect(npc).toMatchObject({ health: 1, team: captor.team, masterId: null });
  expect(getState(params.gameState).teams.captor).toMatchObject({ territory: [6, 4, 5, 1], monsters: ['troll'], coins: 134 });
  expect(getState(params.gameState).teams.loser).toMatchObject({ territory: [], monsters: ['orc'], coins: 0 });
  expect(getWarlordAvailableMonsters(params.gameState, captor.team!)).toEqual(expect.arrayContaining(['troll', 'orc']));
});

it('finishes damaging spell targets before deciding whether a faction has won', async () => {
  const { params, npc, winner } = scenario();
  const subordinate = createNpc({ id: 'sub', team: npc.team, scriptedActions: true, health: 20 });
  params.gameState.npcs.push(subordinate);
  winner.spells = [SpellIds.fireRain];
  winner.magic = 100;
  actionCastSpell(params, winner, { id: 1, type: PlayerActionType.Cast, description: '', spellId: SpellIds.fireRain });
  expect(npc).toMatchObject({ health: 0, team: 'loser' });
  expect(subordinate.health).toBeLessThan(20);
  expect(subordinate.health).toBeGreaterThan(0);
  await finishTurn(params);
  expect(npc).toMatchObject({ health: 0, team: 'loser' });
  subordinate.health = 0;
  await finishTurn(params);
  expect(npc.team).toBe(winner.team);
  expect(subordinate).toMatchObject({ team: winner.team, health: 1 });
});

it('keeps ordinary NPC death rules in other games', () => {
  const { params, npc, winner } = scenario();
  params.gameState.gameId = 'cauldronfire';
  delete npc.deferDefeat;
  actionAttack(params, winner, { id: 1, type: PlayerActionType.Attack, target: npc.id, description: '' });
  expect(npc).toMatchObject({ health: 0, respawnTurns: 3, team: 'loser' });
});
