/** @jest-environment node */
import { specialSpellActions } from './special-spell-actions';
import { SpellIds, spells } from '../games/spells';
import { createMonster, createNpc, createParams } from './test-support/fixtures';
import { getMonsterCombatant } from './monster-combatant';

it('summons a timed ally, expiring only the caster’s existing timed summons', () => {
  const params = createParams();
  const player = params.gameState.players[0];
  params.gameState.npcs = [createNpc({ id: 'old', masterId: player.id, turnsLeft: 5 }),
    createNpc({ id: 'hired', masterId: player.id }), createNpc({ id: 'other', masterId: 'other', turnsLeft: 5 })];
  specialSpellActions[SpellIds.spiritGuide](params, player, spells.spiritGuide, [player]);
  expect(params.gameState.npcs.map(n => n.turnsLeft)).toEqual([1, undefined, 5, 5]);
  expect(params.gameState.npcs[3]).toMatchObject({ id: 'summon-1', masterId: player.id, expiryAction: 'remove', location: { id: 1 } });
  expect(params.gameState.counters.monsterId).toBe(1);
});

it('summons monsters on the monster side without creating NPCs', () => {
  const monster = createMonster();
  const params = createParams({ monsters: [monster] });
  specialSpellActions[SpellIds.raiseDead](params, getMonsterCombatant(monster), spells.raiseDead, [monster]);
  expect(params.monsters[1]).toMatchObject({ id: 'monster-1', type: 'skeleton', location: 1 });
  expect(params.gameState.npcs).toEqual([]);
});

it('transfers a monster corpse to a temporary zombie follower', () => {
  const corpse = createMonster({ health: 0 });
  const params = createParams({ monsters: [corpse] });
  const player = params.gameState.players[0];
  specialSpellActions[SpellIds.animateCorpse](params, player, spells.animateCorpse, [corpse]);
  expect(params.monsters).toEqual([]);
  expect(params.gameState.npcs[0]).toMatchObject({ id: corpse.id, masterId: player.id, zombie: true, turnsLeft: 12, expiryAction: 'monster', monsterType: 'rat' });
  expect(params.gameState.npcs[0].health).toBeGreaterThan(0);
  expect(params.gameState.npcs[0].health).toBeLessThanOrEqual(10);
});

it('lets monster necromancers revive monsters and convert NPCs while players retain their identity', () => {
  const caster = createMonster({ id: 'caster' });
  const corpse = createMonster({ health: 0 });
  const params = createParams({ monsters: [caster, corpse] });
  const npc = createNpc({ health: 0 });
  params.gameState.npcs = [npc];
  const player = params.gameState.players[0];
  player.health = 0;
  specialSpellActions[SpellIds.animateCorpse](params, getMonsterCombatant(caster), spells.animateCorpse, [corpse, npc, player]);
  expect(corpse.zombie).toBe(true);
  expect(corpse.health).toBeGreaterThan(0);
  expect(params.gameState.npcs).toEqual([]);
  expect(params.monsters).toContainEqual(expect.objectContaining({ id: npc.id, type: 'zombie', health: 10 }));
  expect(params.gameState.players[0]).toBe(player);
  expect(player).toMatchObject({ zombie: true, health: 20 });
});
