/** @jest-environment node */
import { getAvailableSpellTargets, isMonsterCaster } from './spell-targets';
import { SpellIds, spells } from '../games/spells';
import { getMonsterCombatant } from './monster-combatant';
import { createMonster, createNpc, createParams, createPlayer } from './test-support/fixtures';

it('selects living allies and enemies from the caster side at the same location', () => {
  const monster = createMonster();
  const params = createParams({ monsters: [monster, createMonster({ id: 'dead', health: 0 }), createMonster({ id: 'far', location: 2 })] });
  const player = params.gameState.players[0];
  const npc = createNpc();
  params.gameState.npcs = [npc, createNpc({ id: 'far-npc', location: { id: 2, move: [], description: '' } })];
  const caster = getMonsterCombatant(monster);
  expect(isMonsterCaster(params, player)).toBe(false);
  expect(isMonsterCaster(params, caster)).toBe(true);
  expect(getAvailableSpellTargets(params, player, spells[SpellIds.heal])).toEqual([player, npc]);
  expect(getAvailableSpellTargets(params, player, spells[SpellIds.fireBall])).toEqual([monster]);
  expect(getAvailableSpellTargets(params, caster, spells[SpellIds.heal])).toEqual([monster]);
  expect(getAvailableSpellTargets(params, caster, spells[SpellIds.fireBall])).toEqual([player, npc]);
});

it('selects local corpses from both sides, excluding living and remote targets', () => {
  const params = createParams({ monsters: [createMonster({ health: 0 }), createMonster({ id: 'far', health: 0, location: 2 })] });
  const player = params.gameState.players[0];
  const dead = createPlayer({ id: 'dead', health: 0 });
  const npc = createNpc({ health: 0 });
  params.gameState.players.push(dead);
  params.gameState.npcs.push(npc);
  expect(getAvailableSpellTargets(params, player, spells[SpellIds.animateCorpse])).toEqual([params.monsters[0], dead, npc]);
});

it('selects mixed teams for player, NPC and monster casters, including self for friendly spells', () => {
  const player = createPlayer({ team: 'red' });
  const npc = createNpc({ team: 'red' });
  const monster = createMonster({ team: 'red' });
  const enemyPlayer = createPlayer({ id: 'enemy-player', team: 'blue' });
  const enemyNpc = createNpc({ id: 'enemy-npc', team: 'blue' });
  const enemyMonster = createMonster({ id: 'enemy-monster', team: 'blue' });
  const params = createParams({ monsters: [monster, enemyMonster] });
  params.gameState.players = [player, enemyPlayer];
  params.gameState.npcs = [npc, enemyNpc];
  for (const caster of [player, npc, getMonsterCombatant(monster)]) {
    expect(getAvailableSpellTargets(params, caster, spells[SpellIds.heal]).map(t => t.id).sort())
      .toEqual([player.id, npc.id, monster.id].sort());
    expect(getAvailableSpellTargets(params, caster, spells[SpellIds.fireBall]).map(t => t.id).sort())
      .toEqual(['enemy-player', 'enemy-npc', 'enemy-monster'].sort());
  }
});
