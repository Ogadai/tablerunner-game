import { getCombatStats, getNamedTargetStats, getPlayerActionsCosts, getPlayerActionsMagic, getPlayerActionsPerTurn, getPlayerStats } from './playerStats';
import { createNpc, createPlayer } from './test-support/fixtures';
import { NOTHING_EQUPPED, PlayerActionType, type PlayerActionCast, type PlayerActionUseItem, type PlayerActionsState } from './types';

describe('action budgets', () => {
  it.each([[0, 18, 12], [4, 18, 12], [5, 17, 11], [49, 9, 3], [50, 8, 2], [100, 8, 2]])('calculates costs at speed %i', (speed, move, attack) => {
    const player = createPlayer();
    player.baseStats!.speed = speed;
    expect(getPlayerActionsPerTurn(player)).toEqual({ total: 20, move, attack });
  });

  it('gives dead players no action budget', () => {
    expect(getPlayerActionsPerTurn(createPlayer({ health: 0 })).total).toBe(0);
  });

  it.each([null, undefined, { actions: [] }])('returns zero costs for absent or empty queues', actions => {
    expect(getPlayerActionsCosts(createPlayer(), actions)).toBe(0);
    expect(getPlayerActionsMagic(createPlayer(), actions)).toBe(0);
  });

  it('sums mixed actions, discounts spells, and charges magic only for casting', () => {
    const player = createPlayer({ equipment: [{ id: 'potion', type: 'healingPotion' }] });
    const actions: PlayerActionsState = { actions: [
      ...[PlayerActionType.Attack, PlayerActionType.Move, PlayerActionType.Portal, PlayerActionType.ReadScroll, PlayerActionType.Respawn, PlayerActionType.FastTravel]
        .map((type, id) => ({ id, type, description: '' })),
      { id: 6, type: PlayerActionType.UseItem, description: '', itemId: 'potion' } as PlayerActionUseItem,
      { id: 7, type: PlayerActionType.UseItem, description: '', itemId: 'missing' } as PlayerActionUseItem,
      { id: 8, type: PlayerActionType.Cast, description: '', spellId: 'spiritArrow' } as PlayerActionCast,
      { id: 9, type: PlayerActionType.Cast, description: '', spellId: 'fireBall' } as PlayerActionCast,
    ] };
    expect(getPlayerActionsCosts(player, actions)).toBe(10 + 16 + 16 + 10 + 5 + 7 + 8);
    expect(getPlayerActionsMagic(player, actions)).toBe(8);
  });
});

describe('combat stats', () => {
  it.each([['swordRusty', 7], ['bowWarped', 13]])('uses the correct attribute for %s', (type, attack) => {
    const stats = getPlayerStats(createPlayer({ equipment: [{ id: 'sword', type }] }));
    expect(stats).toMatchObject({ attack, damage: attack, defence: 10, magic: 10, health: 20, speed: 10 });
  });

  it('ignores unequipped and missing items', () => {
    const player = createPlayer({ equipped: { weapon: NOTHING_EQUPPED, shield: 'missing', helmet: null } });
    expect(getPlayerStats(player)).toMatchObject({ attack: 6, damage: 6, bonuses: { attack: 0, damage: 0 } });
  });

  it('combines equipment and positive/negative effects without mutating base stats or effects', () => {
    const player = createPlayer({ effects: [
      { description: 'Blessed', turns: 2, attack: 3, damage: 0, special: 'glow' },
      { description: 'Slowed', turns: 1, speed: -2, attack: -1 },
    ] });
    const before = JSON.parse(JSON.stringify(player));
    expect(getNamedTargetStats(player.baseStats!, player)).toEqual({
      attack: 9, damage: 7, defence: 10, magic: 10, health: 20, speed: 8,
      bonuses: { attack: 3, damage: 1, defence: 0, magic: 0, health: 0, speed: -2 },
    });
    expect(player).toEqual(before);
  });

  it('enhances raw NPC stats but does not double-apply player bonuses', () => {
    const npc = createNpc();
    expect(getCombatStats(npc)).toMatchObject({ attack: 7, damage: 7 });
    const player = createPlayer();
    player.baseStats = getPlayerStats(player);
    expect(getCombatStats(player)).toBe(player.baseStats);
    expect(getCombatStats(player).attack).toBe(7);
  });
});
