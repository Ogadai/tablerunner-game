/** @jest-environment node */
import {
  getAttackActionIcon,
  getSpellActionIcon,
  getItemActionIcon,
  getEffectActionIcon,
  recordCombatAttack,
  recordCombatSpell,
  recordCombatItem,
  recordCombatEffect,
  finalizeCombatReplays,
  isCombatMessage,
  isActualBattle,
  snapshotPreCombatParticipants,
  getTargetLocationId,
} from './combat-log';
import { createGame, createMonster, createNpc, createParams, createPlayer } from './test-support/fixtures';
import { EntityItemClass } from '../store/types';
import { spells, SpellIds } from '../games/spells';
import { consumableItems, ConsumableIds, equipableItems, EquipableIds } from '../games/items';

describe('combat-log icons', () => {
  it('returns melee attack icon by default', () => {
    const player = createPlayer();
    const icon = getAttackActionIcon(player);
    expect(icon).toEqual({ sheet: 'spell', iconXY: { x: 6, y: 4 } });
  });

  it('returns ranged attack icon when a ranged weapon is equipped', () => {
    const bow = equipableItems[EquipableIds.bowLong];
    const player = createPlayer({
      equipment: [{ id: 'bow-1', type: bow.id }],
      equipped: { weapon: 'bow-1' },
    });
    const icon = getAttackActionIcon(player);
    expect(icon).toEqual({ sheet: 'spell', iconXY: { x: 0, y: 5 } });
  });

  it('returns spell icon from spell definition', () => {
    const fireball = spells[SpellIds.fireBall];
    const icon = getSpellActionIcon(fireball);
    expect(icon).toEqual({ sheet: 'spell', iconXY: fireball.iconXY });
  });

  it('returns item icon from item definition', () => {
    const potion = consumableItems[ConsumableIds.healingPotion];
    const icon = getItemActionIcon(potion);
    expect(icon).toEqual({ sheet: 'item', iconXY: potion.iconXY });
  });

  it('returns appropriate effect action icons', () => {
    expect(getEffectActionIcon('Poison Cloud')).toEqual({ sheet: 'spell', iconXY: spells[SpellIds.poisonCloud].iconXY });
    expect(getEffectActionIcon('Burn Damage')).toEqual({ sheet: 'spell', iconXY: spells[SpellIds.fireBall].iconXY });
    expect(getEffectActionIcon('Blizzard Frost')).toEqual({ sheet: 'spell', iconXY: spells[SpellIds.iceStorm].iconXY });
    expect(getEffectActionIcon('Unknown Effect')).toEqual({ sheet: 'spell', iconXY: { x: 6, y: 4 } });
  });
});

describe('combat-log event recording and finalization', () => {
  it('records attack hits, misses, and defeats', () => {
    const player = createPlayer({ id: 'hero', name: 'Hero', location: { id: 1, description: '', move: [] } });
    const monster = createMonster({ id: 'rat-1', location: 1, health: 10 });
    const params = createParams({
      gameState: createGame({ players: [player] }),
      monsters: [monster],
    });

    // Hit event
    recordCombatAttack(params, 1, player, monster, 4, 6, true);
    // Miss event
    recordCombatAttack(params, 1, player, monster, 0, 6, false);
    // Lethal hit event
    recordCombatAttack(params, 1, player, monster, 6, 0, true, { defeated: true });

    const events = params.combatLogs?.[1].events;
    expect(events).toHaveLength(3);

    expect(events![0].actionType).toBe('attack');
    expect(events![0].initiatorId).toBe('hero');
    expect(events![0].targets[0]).toEqual({
      targetId: 'rat-1',
      targetName: 'Rat',
      healthDelta: -4,
      resultHealth: 6,
      miss: false,
      defeated: false,
      resisted: undefined,
      vulnerable: undefined,
    });

    expect(events![1].targets[0].miss).toBe(true);
    expect(events![1].targets[0].healthDelta).toBe(0);

    expect(events![2].targets[0].defeated).toBe(true);
    expect(events![2].targets[0].resultHealth).toBe(0);
  });

  it('captures initial participant health before combat actions reduce it', () => {
    const player = createPlayer({ id: 'hero', health: 20, location: { id: 1, description: '', move: [] } });
    const monster = createMonster({ id: 'orc', health: 15, location: 1 });
    const params = createParams({
      gameState: createGame({ players: [player] }),
      monsters: [monster],
    });

    snapshotPreCombatParticipants(params);

    // Now reduce health via damage
    monster.health = 5;
    recordCombatAttack(params, 1, player, monster, 10, 5, true);

    const log = params.combatLogs?.[1];
    const initialMonster = log?.initialParticipants.find(p => p.id === 'orc');
    expect(initialMonster?.health).toBe(15);
  });

  it('records multi-target spells', () => {
    const caster = createPlayer({ id: 'mage', name: 'Mage', location: { id: 1, description: '', move: [] } });
    const monster1 = createMonster({ id: 'm1', location: 1, health: 10 });
    const monster2 = createMonster({ id: 'm2', location: 1, health: 8 });
    const params = createParams({
      gameState: createGame({ players: [caster] }),
      monsters: [monster1, monster2],
    });

    const iceStorm = spells[SpellIds.iceStorm];
    recordCombatSpell(params, 1, caster, iceStorm, [
      { target: monster1, healthDelta: -6, resultHealth: 4, miss: false, defeated: false },
      { target: monster2, healthDelta: -8, resultHealth: 0, miss: false, defeated: true },
    ]);

    const events = params.combatLogs?.[1].events;
    expect(events).toHaveLength(1);
    expect(events![0].actionName).toBe('Ice Storm');
    expect(events![0].icon).toEqual({ sheet: 'spell', iconXY: iceStorm.iconXY });
    expect(events![0].targets).toHaveLength(2);
    expect(events![0].targets[0].healthDelta).toBe(-6);
    expect(events![0].targets[1].defeated).toBe(true);
  });

  it('records item consumption and resurrection targets', () => {
    const player = createPlayer({ id: 'hero', health: 15, location: { id: 1, description: '', move: [] } });
    const deadAlly = createPlayer({ id: 'ally', health: 0, location: { id: 1, description: '', move: [] } });
    const params = createParams({ gameState: createGame({ players: [player, deadAlly] }) });

    const potion = consumableItems[ConsumableIds.healingPotion];
    recordCombatItem(params, 1, player, potion, [{ target: player, healthDelta: 10, resultHealth: 25 }]);

    const resStone = consumableItems[ConsumableIds.resurrectionStone];
    recordCombatItem(params, 1, player, resStone, [{ target: deadAlly, healthDelta: 1, resultHealth: 1 }]);

    recordCombatEffect(params, 1, player, 'Poison Cloud', 3, 22);

    const events = params.combatLogs?.[1].events;
    expect(events).toHaveLength(3);
    expect(events![0].actionType).toBe('item');
    expect(events![0].targets[0].healthDelta).toBe(10);

    // Resurrection item records the dead target receiving health
    expect(events![1].actionType).toBe('item');
    expect(events![1].targets[0].targetId).toBe('ally');
    expect(events![1].targets[0].healthDelta).toBe(1);
    expect(events![1].targets[0].resultHealth).toBe(1);

    expect(events![2].actionType).toBe('effect');
    expect(events![2].targets[0].healthDelta).toBe(-3);
  });

  it('finalizes combat replays with perspective-aware classification', () => {
    const player1 = createPlayer({ id: 'p1', name: 'Player One', team: 'blue', location: { id: 1, description: '', move: [] } });
    const player2 = createPlayer({ id: 'p2', name: 'Player Two', team: 'red', location: { id: 1, description: '', move: [] } });
    const allyNpc = createNpc({ id: 'ally', name: 'Ally NPC', team: 'blue', location: { id: 1, description: '', move: [] } });
    const monster = createMonster({ id: 'm1', location: 1, health: 20 });
    const calmPlayer = createPlayer({ id: 'calm', name: 'Quiet Guy', team: 'blue', location: { id: 2, description: '', move: [] } });

    const params = createParams({
      gameState: createGame({ players: [player1, player2, calmPlayer], npcs: [allyNpc] }),
      monsters: [monster],
      playerCombatLocations: { p1: 1, p2: 1, calm: 2 },
    });

    recordCombatAttack(params, 1, player1, player2, 5, 15, true);

    finalizeCombatReplays(params);

    // Calm player was at location 2, where no combat happened
    expect(params.messages.calm.battleReplay).toBeUndefined();

    // Player 1 perspective
    const replay1 = params.messages.p1.battleReplay;
    expect(replay1).toBeDefined();
    expect(replay1!.locationId).toBe(1);
    expect(replay1!.events).toHaveLength(1);

    const p1Self = replay1!.initialEntities.find(e => e.id === 'p1');
    const p1Opponent = replay1!.initialEntities.find(e => e.id === 'p2');
    const p1Ally = replay1!.initialEntities.find(e => e.id === 'ally');
    const p1Monster = replay1!.initialEntities.find(e => e.id === 'm1');

    expect(p1Self?.className).toBe(EntityItemClass.self);
    expect(p1Opponent?.className).toBe(EntityItemClass.enemy);
    expect(p1Ally?.className).toBe(EntityItemClass.friendly);
    expect(p1Monster?.className).toBe(EntityItemClass.enemy);

    // Player 2 perspective
    const replay2 = params.messages.p2.battleReplay;
    expect(replay2).toBeDefined();
    const p2Self = replay2!.initialEntities.find(e => e.id === 'p2');
    const p2Opponent = replay2!.initialEntities.find(e => e.id === 'p1');

    expect(p2Self?.className).toBe(EntityItemClass.self);
    expect(p2Opponent?.className).toBe(EntityItemClass.enemy);
  });

  it('correctly extracts location id with type safety guard', () => {
    const player = createPlayer({ location: { id: 4, description: '', move: [] } });
    const monster = createMonster({ location: 8 });
    expect(getTargetLocationId(player)).toBe(4);
    expect(getTargetLocationId(monster)).toBe(8);
    expect(getTargetLocationId({ id: 'raw', health: 10, team: null })).toBeUndefined();
  });

  it('correctly classifies combat vs non-combat messages for suppression', () => {
    expect(isCombatMessage('*You* hit **Rat** for **3** damage')).toBe(true);
    expect(isCombatMessage('**Rat** missed *You*')).toBe(true);
    expect(isCombatMessage('*You* healed yourself for **10** health!')).toBe(true);
    expect(isCombatMessage('**Hero** took **4** damage from **Poison** and *was defeated!*')).toBe(true);
    expect(isCombatMessage('***You are dead!***')).toBe(true);
    expect(isCombatMessage('*You* drank **Healing Potion** for **20** health!')).toBe(true);

    // Non-combat messages
    expect(isCombatMessage('*You* collected **5** coins')).toBe(false);
    expect(isCombatMessage('*You* found a Chest!')).toBe(false);
    expect(isCombatMessage('Blue team captured the Watchtower!')).toBe(false);
    expect(isCombatMessage('*You* learned **Fireball**')).toBe(false);
  });

  describe('isActualBattle', () => {
    it('returns false when replay or events are missing or empty', () => {
      expect(isActualBattle(undefined)).toBe(false);
      expect(isActualBattle({ locationId: 1, initialEntities: [], events: [] })).toBe(false);
    });

    it('returns false for self buff actions and drinking potions when no enemies are involved', () => {
      const potionReplay = {
        locationId: 1,
        initialEntities: [
          { id: 'p1', name: 'Hero', className: EntityItemClass.self, health: 15, maxHealth: 20, iconXY: { x: 0, y: 0 } },
        ],
        events: [
          {
            id: 'e1',
            initiatorId: 'p1',
            initiatorName: 'Hero',
            actionType: 'item' as const,
            actionName: 'Health Potion',
            icon: { sheet: 'item' as const, iconXY: { x: 0, y: 0 } },
            targets: [{ targetId: 'p1', targetName: 'Hero', healthDelta: 10, resultHealth: 20 }],
          },
        ],
      };
      expect(isActualBattle(potionReplay)).toBe(false);

      const buffReplay = {
        locationId: 1,
        initialEntities: [
          { id: 'p1', name: 'Hero', className: EntityItemClass.self, health: 20, maxHealth: 20, iconXY: { x: 0, y: 0 } },
          { id: 'ally', name: 'Ally', className: EntityItemClass.friendly, health: 20, maxHealth: 20, iconXY: { x: 0, y: 0 } },
        ],
        events: [
          {
            id: 'e2',
            initiatorId: 'p1',
            initiatorName: 'Hero',
            actionType: 'spell' as const,
            actionName: 'Bless',
            icon: { sheet: 'spell' as const, iconXY: { x: 0, y: 0 } },
            targets: [{ targetId: 'ally', targetName: 'Ally', healthDelta: 0, resultHealth: 20 }],
          },
        ],
      };
      expect(isActualBattle(buffReplay)).toBe(false);
    });

    it('returns true when an attack action occurs', () => {
      const attackReplay = {
        locationId: 1,
        initialEntities: [],
        events: [
          {
            id: 'e1',
            initiatorId: 'p1',
            initiatorName: 'Hero',
            actionType: 'attack' as const,
            actionName: 'Slash',
            icon: { sheet: 'spell' as const, iconXY: { x: 0, y: 0 } },
            targets: [{ targetId: 'm1', targetName: 'Monster', healthDelta: -5, resultHealth: 5 }],
          },
        ],
      };
      expect(isActualBattle(attackReplay)).toBe(true);
    });

    it('returns true when an enemy initiates an action or is targeted', () => {
      const enemyReplay = {
        locationId: 1,
        initialEntities: [
          { id: 'p1', name: 'Hero', className: EntityItemClass.self, health: 20, maxHealth: 20, iconXY: { x: 0, y: 0 } },
          { id: 'm1', name: 'Goblin', className: EntityItemClass.enemy, health: 10, maxHealth: 10, iconXY: { x: 0, y: 0 } },
        ],
        events: [
          {
            id: 'e1',
            initiatorId: 'p1',
            initiatorName: 'Hero',
            actionType: 'spell' as const,
            actionName: 'Fireball',
            icon: { sheet: 'spell' as const, iconXY: { x: 0, y: 0 } },
            targets: [{ targetId: 'm1', targetName: 'Goblin', healthDelta: -8, resultHealth: 2 }],
          },
        ],
      };
      expect(isActualBattle(enemyReplay)).toBe(true);

      const enemyCastReplay = {
        locationId: 1,
        initialEntities: [
          { id: 'p1', name: 'Hero', className: EntityItemClass.self, health: 20, maxHealth: 20, iconXY: { x: 0, y: 0 } },
          { id: 'm1', name: 'Shaman', className: EntityItemClass.enemy, health: 10, maxHealth: 10, iconXY: { x: 0, y: 0 } },
        ],
        events: [
          {
            id: 'e2',
            initiatorId: 'm1',
            initiatorName: 'Shaman',
            actionType: 'spell' as const,
            actionName: 'Curse',
            icon: { sheet: 'spell' as const, iconXY: { x: 0, y: 0 } },
            targets: [{ targetId: 'p1', targetName: 'Hero', healthDelta: 0, resultHealth: 20 }],
          },
        ],
      };
      expect(isActualBattle(enemyCastReplay)).toBe(true);
    });
  });
});
