/** @jest-environment node */
import { getEnemies, getFriends } from './game-friends-or-enemies';
import { getMonsterCombatant } from './monster-combatant';
import { createMonster, createNpc, createParams, createPlayer } from './test-support/fixtures';

it('uses teams across character types, excludes self and remote targets, and retains corpses', () => {
  const actor = createPlayer({ team: 'red' });
  const params = createParams({ monsters: [
    createMonster({ id: 'ally-monster', team: 'red' }),
    createMonster({ id: 'enemy-monster', team: 'blue' }),
    createMonster({ id: 'far-monster', location: 2 }),
  ] });
  params.gameState.players = [actor, createPlayer({ id: 'ally-player', team: 'red' }),
    createPlayer({ id: 'enemy-player', team: 'blue' }),
    createPlayer({ id: 'far-player', location: { id: 2, description: '', move: [] } })];
  params.gameState.npcs = [createNpc({ id: 'ally-npc', team: 'red' }),
    createNpc({ id: 'neutral-npc', team: null }),
    createNpc({ id: 'dead-enemy', team: 'blue', health: 0 })];
  expect(getFriends(params, actor).map(t => t.id)).toEqual(['ally-player', 'ally-npc', 'ally-monster']);
  expect(getEnemies(params, actor).map(t => t.id)).toEqual(['enemy-player', 'dead-enemy', 'enemy-monster']);
  const monsterActor = getMonsterCombatant(params.monsters[0]);
  expect(getFriends(params, monsterActor).map(t => t.id)).toEqual([actor.id, 'ally-player', 'ally-npc']);
});

it('does not treat players, other NPCs or monsters as enemies of an unhired NPC', () => {
  const actor = createNpc({ id: 'unhired-npc', team: null });
  const params = createParams({ monsters: [createMonster()] });
  params.gameState.players = [createPlayer()];
  params.gameState.npcs = [actor, createNpc({ id: 'hired-npc', team: 'good' }),
    createNpc({ id: 'enemy-npc', team: 'red' }), createNpc({ id: 'neutral-npc', team: null })];

  expect(getEnemies(params, actor)).toEqual([]);
});
