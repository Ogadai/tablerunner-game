import { actionAttack, genericAttackMonster, handlePlayerIsDead, monsterAttack, processAttackForDamage } from './game-action-attack';
import { BaseParams } from './base-params';
import { MonsterState, NPCState, PlayerActionAttack, PlayerActionType, PlayerState } from '../store/types';
import { ConsumableIds } from '../games/items';
import { createItemForInventory } from './apply-inventory';

jest.mock('./apply-inventory', () => ({
  createItemForInventory: jest.fn((_state, item) => ({ id: 'item', type: item.id })),
}));

function createPlayer(id: string, health = 10): PlayerState {
  return {
    id,
    name: id,
    location: { id: 1, description: '', move: [] },
    rgbColour: '#fff',
    characterStats: { strength: 1, skill: 1, reactions: 1, resiliance: 1, intelligence: 1 },
    health,
    baseStats: { attack: 10, damage: 4, defence: 2, health: 10, magic: 0, speed: 1 },
    magic: 0,
    level: 1,
    points: 0,
    availableStats: 0,
    equipment: [],
    equipped: {},
    spells: [],
    coins: 0,
  };
}

function createMonster(id: string, type: string, health = 1): MonsterState {
  return { id, type, location: 1, health };
}

function createParams(monsters: MonsterState[], players: PlayerState[]): BaseParams {
  return {
    boardId: 'board',
    mapId: 'map',
    gameState: {
      gameId: 'game',
      turn: 0,
      name: 'game',
      characters: [],
      players,
      npcs: [],
      visited: [],
      stores: [],
      portals: [],
      visitedPortals: [],
      processState: {},
      leds: [],
      counters: { monsterId: 0, itemId: 0 },
    },
    messages: { p1: { messages: [] }, p2: { messages: [] } },
    monsters,
    npcs: [],
    items: [],
    coins: [],
    blockedMoves: [],
  };
}

afterEach(() => {
  jest.restoreAllMocks();
});

// Remaining rolls skip random loot and drop the maximum coins for weak monsters.
function hit(damageRoll = 0.5) {
  return jest.spyOn(Math, 'random').mockReturnValue(0.99)
    .mockReturnValueOnce(0.9).mockReturnValueOnce(0).mockReturnValueOnce(damageRoll);
}

describe('genericAttackMonster coin drops', () => {
  it('accumulates coins until the last monster dies, then distributes them', () => {
    const firstMonster = createMonster('m1', 'rat');
    const lastMonster = createMonster('m2', 'spider');
    const firstPlayer = createPlayer('p1');
    const secondPlayer = createPlayer('p2');
    const params = createParams([firstMonster, lastMonster], [firstPlayer, secondPlayer]);
    const random = hit();

    genericAttackMonster(params, firstPlayer, { attack: 10, damage: 1 }, firstMonster);

    expect(params.coins).toHaveLength(1);
    expect(params.coins[0]).toEqual({ location: 1, coins: 2 });
    expect(firstPlayer.coins).toBe(0);
    expect(secondPlayer.coins).toBe(0);

    random.mockReturnValueOnce(0.9).mockReturnValueOnce(0).mockReturnValueOnce(0.5);
    genericAttackMonster(params, firstPlayer, { attack: 10, damage: 1 }, lastMonster);

    expect(params.coins).toEqual([]);
    // Rat drops 2 and spider drops 5; each player receives ceil(7 / 2).
    expect(firstPlayer.coins).toBe(4);
    expect(secondPlayer.coins).toBe(4);
  });

  it('awards coins only to living players at the cleared location', () => {
    const player = createPlayer('p1');
    const dead = createPlayer('dead', 0);
    const elsewhere = createPlayer('elsewhere');
    elsewhere.location.id = 2;
    const monster = createMonster('m1', 'rat');
    const otherMonster = { ...createMonster('m2', 'rat'), location: 2 };
    const params = createParams([monster, otherMonster], [player, dead, elsewhere]);
    params.coins = [{ location: 1, coins: 5 }, { location: 2, coins: 10 }];
    hit();

    genericAttackMonster(params, player, { attack: 10, damage: 1 }, monster);

    expect(player.coins).toBe(7);
    expect(dead.coins).toBe(0);
    expect(elsewhere.coins).toBe(0);
    expect(params.coins).toEqual([{ location: 2, coins: 10 }]);
  });

  it('leaves coins on the ground when no living players can collect them', () => {
    const player = createPlayer('p1');
    const monster = createMonster('m1', 'rat');
    const params = createParams([monster], []);
    hit();
    genericAttackMonster(params, player, { attack: 10, damage: 1 }, monster);
    expect(params.coins).toEqual([{ location: 1, coins: 2 }]);
  });
});

describe('processAttackForDamage', () => {
  it('misses when the defense roll exceeds the attack roll', () => {
    const random = jest.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValueOnce(0.9);
    expect(processAttackForDamage({ attack: 10, damage: 5 }, { defence: 10 })).toBe(0);
    expect(random).toHaveBeenCalledTimes(2);
  });

  it('hits on a tied roll and rounds damage up', () => {
    jest.spyOn(Math, 'random').mockReturnValueOnce(0.5).mockReturnValueOnce(0.5).mockReturnValueOnce(0.21);
    expect(processAttackForDamage({ attack: 10, damage: 5 }, { defence: 10 })).toBe(2);
  });
});

describe('genericAttackMonster', () => {
  it('caps damage at remaining health and shares points only with living nearby players', () => {
    const player = createPlayer('p1');
    const ally = createPlayer('p2');
    const dead = createPlayer('dead', 0);
    const elsewhere = createPlayer('elsewhere');
    elsewhere.location.id = 2;
    const monster = createMonster('m1', 'rat', 3);
    const params = createParams([monster], [player, ally, dead, elsewhere]);
    hit();
    expect(genericAttackMonster(params, player, { attack: 10, damage: 100 }, monster)).toBe(true);
    expect(monster.health).toBe(0);
    expect([player.points, ally.points, dead.points, elsewhere.points]).toEqual([3, 3, 0, 0]);
    expect(params.messages.p1.messages).toContainEqual({ text: '**You** hit **Rat** for **3** damage and **defeated** it!' });
  });

  it('does not award loot or coins for a nonlethal hit', () => {
    const player = createPlayer('p1');
    const monster = createMonster('m1', 'rat', 5);
    const params = createParams([monster], [player]);
    hit();
    expect(genericAttackMonster(params, player, { name: 'fireball', attack: 10, damage: 4 }, monster)).toBe(true);
    expect(monster.health).toBe(3);
    expect(params.items).toEqual([]);
    expect(params.coins).toEqual([]);
    expect(params.messages.p1.messages).toEqual([{ text: '**Your** fireball hit **Rat** for **2** damage' }]);
  });

  it('leaves state unchanged on a miss', () => {
    const player = createPlayer('p1');
    const monster = createMonster('m1', 'rat', 5);
    const params = createParams([monster], [player]);
    jest.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.9);
    expect(genericAttackMonster(params, player, { attack: 10, damage: 4 }, monster)).toBe(false);
    expect(monster.health).toBe(5);
    expect(player.points).toBe(0);
    expect(params.items).toEqual([]);
    expect(params.coins).toEqual([]);
    expect(params.messages.p1.messages).toEqual([{ text: '**You** missed **Rat**' }]);
  });

  it('ignores already dead monsters', () => {
    const player = createPlayer('p1');
    const monster = createMonster('m1', 'rat', 0);
    const params = createParams([monster], [player]);
    const random = hit();
    expect(genericAttackMonster(params, player, { attack: 10, damage: 4 }, monster)).toBe(false);
    expect(random).not.toHaveBeenCalled();
    expect(params.items).toEqual([]);
    expect(params.coins).toEqual([]);
    expect(player.points).toBe(0);
  });

  it.each([['rat', ConsumableIds.healingPotion], ['dragon', ConsumableIds.greaterHealingPotion]])(
    'drops the appropriate healing potion for a %s', (type, potion) => {
      const player = createPlayer('p1');
      const monster = createMonster('m1', type);
      const params = createParams([monster], [player]);
      hit().mockReturnValueOnce(0.25);
      genericAttackMonster(params, player, { attack: 100, damage: 4 }, monster);
      expect(params.items).toEqual([{ id: 'item', type: potion, location: 1 }]);
      expect(createItemForInventory).toHaveBeenCalledTimes(1);
    },
  );

  it('adds generated loot at the defeated monster location', () => {
    const player = createPlayer('p1');
    const monster = createMonster('m1', 'rat');
    const params = createParams([monster], [player]);
    hit().mockReturnValueOnce(0.99).mockReturnValueOnce(0).mockReturnValueOnce(0);
    genericAttackMonster(params, player, { attack: 10, damage: 4 }, monster);
    expect(createItemForInventory).toHaveBeenCalledTimes(1);
    const [state, item] = jest.mocked(createItemForInventory).mock.calls[0];
    expect(state).toBe(params.gameState);
    expect(item.value).toBeLessThanOrEqual(15);
    expect(params.items).toEqual([{ id: 'item', type: item.id, location: 1 }]);
  });
});

describe('actionAttack', () => {
  const attack = (target: string): PlayerActionAttack => ({ id: 1, type: PlayerActionType.Attack, description: '', target });

  it('infects a non-zombie monster hit by a zombie player', () => {
    const player = createPlayer('p1');
    player.zombie = true;
    const monster = createMonster('m1', 'rat', 5);
    const params = createParams([monster], [player]);
    hit();
    actionAttack(params, player, attack(monster.id));
    expect(monster.health).toBe(3);
    expect(monster.infected).toBe(3);
  });

  it.each(['player', 'npc'])('attacks a %s target and handles death', kind => {
    const player = createPlayer('p1');
    const target = createPlayer('p2', 1);
    const npc: NPCState = { ...target, masterId: null, hireCost: 0, iconXY: { x: 0, y: 0 } };
    const params = createParams([], kind === 'player' ? [player, target] : [player]);
    params.gameState.npcs = kind === 'npc' ? [npc] : [];
    hit();
    actionAttack(params, player, attack('p2'));
    expect(kind === 'npc' ? npc : target).toMatchObject({ health: 0, respawnTurns: 6 });
  });

  it('ignores unknown targets', () => {
    const player = createPlayer('p1');
    const params = createParams([], [player]);
    const random = hit();
    actionAttack(params, player, attack('missing'));
    expect(random).not.toHaveBeenCalled();
    expect(params.messages.p1.messages).toEqual([]);
  });

  it('ignores dead player targets', () => {
    const player = createPlayer('p1');
    const target = createPlayer('p2', 0);
    const params = createParams([], [player, target]);
    const random = hit();
    actionAttack(params, player, attack(target.id));
    expect(random).not.toHaveBeenCalled();
    expect(target.respawnTurns).toBeUndefined();
  });

  it('does not infect monsters on a miss or when they are already zombies', () => {
    const player = createPlayer('p1');
    player.zombie = true;
    const monster = createMonster('m1', 'rat', 5);
    const params = createParams([monster], [player]);
    const random = jest.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.9);
    actionAttack(params, player, attack(monster.id));
    expect(monster.infected).toBeUndefined();
    monster.zombie = true;
    random.mockReturnValueOnce(0.9).mockReturnValueOnce(0).mockReturnValueOnce(0.5);
    actionAttack(params, player, attack(monster.id));
    expect(monster.health).toBe(3);
    expect(monster.infected).toBeUndefined();
  });
});

describe('monsterAttack and player death', () => {
  it('caps health at zero and starts the respawn countdown on a lethal hit', () => {
    const player = createPlayer('p1', 1);
    const monster = createMonster('m1', 'rat');
    const params = createParams([monster], [player]);
    hit(0.9);
    monsterAttack(params, monster, player, 1);
    expect(player.health).toBe(0);
    expect(player.respawnTurns).toBe(6);
  });

  it.each([[0.09, 3], [0.1, undefined]] as const)('applies zombie infection at roll %s', (roll, infected) => {
    const player = createPlayer('p1');
    const monster = { ...createMonster('m1', 'rat'), zombie: true };
    const params = createParams([monster], [player]);
    hit().mockReturnValueOnce(roll);
    monsterAttack(params, monster, player, 1);
    expect(player.health).toBe(9);
    expect(player.infected).toBe(infected);
  });

  it('does not damage or infect the player on a miss', () => {
    const player = createPlayer('p1');
    const monster = { ...createMonster('m1', 'rat'), zombie: true };
    const params = createParams([monster], [player]);
    jest.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.9);
    monsterAttack(params, monster, player, 1);
    expect(player.health).toBe(10);
    expect(player.infected).toBeUndefined();
    expect(params.messages.p1.messages).toEqual([{ text: '**Zombie Rat** missed **You**' }]);
  });

  it('drops resurrection items at the death location and retains other equipment', () => {
    const player = createPlayer('p1', 0);
    const stone = { id: 'stone', type: ConsumableIds.resurrectionStone };
    const shard = { id: 'shard', type: ConsumableIds.resurrectionShard };
    const potion = { id: 'potion', type: ConsumableIds.healingPotion };
    player.equipment = [stone, potion, shard];
    const params = createParams([], [player]);
    handlePlayerIsDead(params, player, '**{player}** fell into a trap');
    expect(player.equipment).toEqual([potion]);
    expect(params.items).toEqual([{ ...stone, location: 1 }, { ...shard, location: 1 }]);
    expect(player.respawnTurns).toBe(6);
    expect(params.messages.p1.messages).toEqual([{ text: '**You** fell into a trap' }]);
  });
});
