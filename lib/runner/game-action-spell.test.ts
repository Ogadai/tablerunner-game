/** @jest-environment node */
import { actionCastSpell, actionReadScroll } from './game-action-spell';
import { genericAttackMonster, handlePlayerIsDead, processAttackForDamage } from './game-action-attack';
import { SpellIds, spells } from '../games/spells';
import { scrollItems } from '../games/items';
import { PlayerActionType } from '../store/types';
import { createMonster, createNpc, createParams, createPlayer } from './test-support/fixtures';
import { getMonsterCombatant } from './monster-combatant';

jest.mock('./game-action-attack', () => ({ genericAttackMonster: jest.fn(), handlePlayerIsDead: jest.fn(), processAttackForDamage: jest.fn() }));

it('heals and buffs allied monsters in persisted state, rejecting enemies and friendly fire', () => {
  const ally = createMonster({ team: 'good', health: 1 });
  const params = createParams({ monsters: [ally] });
  const caster = params.gameState.players[0];
  caster.spells = [SpellIds.heal, SpellIds.shield, SpellIds.fireBall];
  caster.magic = 100;
  const cast = (spellId: SpellIds) => actionCastSpell(params, caster, {
    id: 1, type: PlayerActionType.Cast, description: '', spellId, targetId: ally.id,
  });
  cast(SpellIds.heal);
  expect(ally.health).toBeGreaterThan(1);
  cast(SpellIds.shield);
  expect(ally.effects).toContainEqual(expect.objectContaining({ description: spells.shield.name }));
  const magic = caster.magic;
  cast(SpellIds.fireBall);
  expect(genericAttackMonster).not.toHaveBeenCalled();
  expect(caster.magic).toBe(magic);
  ally.team = 'enemy';
  ally.health = 1;
  cast(SpellIds.heal);
  expect(ally.health).toBe(1);
  expect(caster.magic).toBe(magic);
});

it.each(['player', 'npc'])('damages an enemy %s with a player spell', kind => {
  const target = kind === 'player' ? createPlayer({ id: 'enemy', team: 'other' }) : createNpc({ team: 'other' });
  const params = createParams();
  if ('masterId' in target) params.gameState.npcs.push(target);
  else params.gameState.players.push(target);
  const caster = params.gameState.players[0];
  caster.spells = [SpellIds.fireBall];
  jest.mocked(processAttackForDamage).mockReturnValue(3);
  actionCastSpell(params, caster, { id: 1, type: PlayerActionType.Cast, description: '', spellId: SpellIds.fireBall, targetId: target.id });
  expect(target.health).toBe(17);
});

it.each(['unknown', 'dead', 'no-magic', 'remote', 'missing-target'])('does not spend mana for an invalid cast: %s', reason => {
  const params = createParams({ monsters: [createMonster()] });
  const player = params.gameState.players[0];
  player.spells = reason === 'unknown' ? [] : [SpellIds.fireBall];
  if (reason === 'dead') player.health = 0;
  if (reason === 'no-magic') player.magic = 4;
  if (reason === 'remote') params.monsters[0].location = 2;
  const magic = player.magic;
  actionCastSpell(params, player, { id: 1, type: PlayerActionType.Cast, description: '', spellId: SpellIds.fireBall,
    targetId: reason === 'missing-target' ? 'missing' : 'rat' });
  expect(player.magic).toBe(magic);
  expect(player.recentSpells).toBeUndefined();
  expect(genericAttackMonster).not.toHaveBeenCalled();
});

it('casts on the selected monster, spends mana once, and deduplicates recent spells', () => {
  const monster = createMonster();
  const params = createParams({ monsters: [monster, createMonster({ id: 'other' })] });
  const player = params.gameState.players[0];
  player.spells = [SpellIds.fireBall];
  player.recentSpells = [SpellIds.heal, SpellIds.fireBall];
  actionCastSpell(params, player, { id: 1, type: PlayerActionType.Cast, description: '', spellId: SpellIds.fireBall, targetId: monster.id });
  expect(genericAttackMonster).toHaveBeenCalledTimes(1);
  expect(genericAttackMonster).toHaveBeenCalledWith(params, player, { name: 'Fire Ball', attack: 10, damage: 15, damageType: 'fire' }, monster);
  expect(player.magic).toBe(5);
  expect(player.recentSpells).toEqual([SpellIds.fireBall, SpellIds.heal]);
});

it('caps healing and refreshes matching effects instead of stacking them', () => {
  const params = createParams();
  const player = params.gameState.players[0];
  player.spells = [SpellIds.heal, SpellIds.shield];
  player.magic = 100;
  player.health = 19;
  actionCastSpell(params, player, { id: 1, type: PlayerActionType.Cast, description: '', spellId: SpellIds.heal, targetId: player.id });
  expect(player.health).toBe(20);
  player.effects = [{ description: spells.shield.name, turns: 1, defence: 1 }, { description: 'Other', turns: 3, speed: 2 }];
  actionCastSpell(params, player, { id: 2, type: PlayerActionType.Cast, description: '', spellId: SpellIds.shield, targetId: player.id });
  expect(player.effects).toHaveLength(2);
  expect(player.effects).toContainEqual(expect.objectContaining({ description: spells.shield.name, defence: spells.shield.bonusStats.defence, turns: spells.shield.bonusStats.turns }));
  expect(player.effects[0]).toEqual({ description: 'Other', turns: 3, speed: 2 });
});

it('applies monster spell damage to characters and handles lethal damage', () => {
  const monster = createMonster({ spells: [SpellIds.fireBall], magic: 10 });
  const params = createParams({ monsters: [monster] });
  const player = params.gameState.players[0];
  jest.mocked(processAttackForDamage).mockReturnValue(100);
  actionCastSpell(params, getMonsterCombatant(monster), { id: 1, type: PlayerActionType.Cast, description: '', spellId: SpellIds.fireBall, targetId: player.id });
  expect(player.health).toBe(0);
  expect(handlePlayerIsDead).toHaveBeenCalledWith(params, player);
  expect(monster.magic).toBe(5);
});

it.each(['learn', 'known', 'insufficient', 'missing'])('handles scroll learning: %s', reason => {
  const scroll = Object.values(scrollItems).find(item => item.spellId === SpellIds.heal)!;
  const params = createParams();
  const player = params.gameState.players[0];
  player.equipment = [{ id: 'scroll', type: scroll.id }];
  player.baseStats!.magic = reason === 'insufficient' ? spells.heal.intelligence - 1 : spells.heal.intelligence;
  player.spells = reason === 'known' ? [SpellIds.heal] : [];
  actionReadScroll(params, player, { id: 1, type: PlayerActionType.ReadScroll, description: '', itemId: reason === 'missing' ? 'missing' : 'scroll' });
  expect(player.equipment).toHaveLength(reason === 'learn' ? 0 : 1);
  expect(player.spells).toEqual(reason === 'learn' || reason === 'known' ? [SpellIds.heal] : []);
});
