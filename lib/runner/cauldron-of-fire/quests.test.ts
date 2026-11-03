/** @jest-environment node */
import { EquipableIds, SpecialIds } from '@/lib/games/items';
import { createLocations } from '@/lib/store/test-support/fixtures';
import { createGame, createParams, createPlayer } from '../test-support/fixtures';
import { QuestInstance } from './quest-types';
import { activateQuest, getQuestsState, questProcess, saveQuestsState } from './quests';

describe('Cauldron of Fire Quests', () => {
  it('generates between 22 and 28 quests with 2-3 character-specific personal quests per character and the remainder shared', async () => {
    const params = createParams({
      gameState: createGame({ gameId: 'cauldronfire' }),
    });

    await questProcess.setup!(params);
    const state = getQuestsState(params.gameState);

    expect(state.quests.length).toBeGreaterThanOrEqual(22);
    expect(state.quests.length).toBeLessThanOrEqual(28);

    for (const characterId of ['barbarian', 'ranger', 'mage', 'witch']) {
      const charQuests = state.quests.filter(q => q.scope === 'player' && q.assignedPlayerId === characterId);
      expect(charQuests.length).toBeGreaterThanOrEqual(2);
      expect(charQuests.length).toBeLessThanOrEqual(3);
      for (const q of charQuests) {
        expect(q.reward.itemId).toBeDefined();
      }
    }

    const sharedQuests = state.quests.filter(q => q.scope === 'shared');
    expect(sharedQuests.length).toBeGreaterThanOrEqual(10);

    for (const q of state.quests) {
      expect(q.status).toBe('available');
      expect(q.offerLocation).toBeGreaterThanOrEqual(1);
      expect(q.reward.coins).toBeGreaterThan(0);
      expect(q.reward.points).toBeGreaterThan(0);
    }
  });

  it('prevents a character from accepting another character’s personal quest', () => {
    const mage = createPlayer({ id: 'mage', location: { id: 10, description: '', move: [] } });
    const gameState = createGame({ gameId: 'cauldronfire', players: [mage] });
    const locationsState = createLocations();

    const barbarianQuest: QuestInstance = {
      id: 'q-barb',
      templateId: 'deliver-1',
      title: 'Barbarian Trial',
      description: 'Deliver the ledger.',
      category: 'deliver_item',
      scope: 'player',
      assignedPlayerId: 'barbarian',
      tier: 'early',
      status: 'available',
      offerLocation: 10,
      destinationLocation: 22,
      itemType: SpecialIds.questRoyalLedger,
      reward: { coins: 40, points: 80, itemId: EquipableIds.axeBattle },
    };

    expect(() => activateQuest(barbarianQuest, mage, gameState, locationsState)).toThrow(
      'This quest is only available to another hero',
    );
  });

  it('spawns the quest item on accept for retrieve_item and completes when returned to offerLocation', async () => {
    const player1 = createPlayer({ id: 'barbarian', location: { id: 22, description: '', move: [] }, coins: 10, points: 0 });
    const player2 = createPlayer({ id: 'mage', location: { id: 5, description: '', move: [] }, health: 0, coins: 20, points: 0 });
    const gameState = createGame({
      gameId: 'cauldronfire',
      players: [player1, player2],
    });
    const locationsState = createLocations();

    const quest: QuestInstance = {
      id: 'q-retrieve',
      templateId: 'retrieve-se-village-heirloom',
      title: 'Stolen Village Sun Medallion',
      description: 'Recover the Sun Medallion.',
      category: 'retrieve_item',
      scope: 'shared',
      tier: 'early',
      status: 'available',
      offerLocation: 22,
      actualTargetLocation: 18,
      hintLocations: [18, 20],
      itemType: SpecialIds.questSunMedallion,
      reward: { coins: 50, points: 100, itemId: EquipableIds.swordSteel },
    };
    saveQuestsState(gameState, { quests: [quest] });

    // Accept the quest
    activateQuest(quest, player1, gameState, locationsState);
    expect(quest.status).toBe('active');
    expect(quest.spawnedItemId).toBeDefined();
    expect(locationsState.items).toEqual([
      expect.objectContaining({
        id: quest.spawnedItemId,
        type: SpecialIds.questSunMedallion,
        location: 18,
      }),
    ]);

    // Player picks up the item and returns to offerLocation 22
    player1.equipment.push({ id: quest.spawnedItemId!, type: SpecialIds.questSunMedallion });
    saveQuestsState(gameState, { quests: [quest] });

    const params = createParams({ gameState, ...locationsState });
    await questProcess.executeForTurn!(params);

    const updated = getQuestsState(params.gameState).quests[0];
    expect(updated.status).toBe('completed');
    expect(updated.completedByPlayerId).toBe('barbarian');
    // Quest item removed from inventory, reward item added to completing player
    expect(player1.equipment.some(i => i.id === quest.spawnedItemId)).toBe(false);
    expect(player1.equipment.some(i => i.type === EquipableIds.swordSteel)).toBe(true);
    expect(player2.equipment.some(i => i.type === EquipableIds.swordSteel)).toBe(false);

    // Both living and dead players receive full unsplit coins and XP on shared quest
    expect(player1.coins).toBe(60);
    expect(player2.coins).toBe(70);
    expect(player1.points).toBe(100);
    expect(player2.points).toBe(100);
  });

  it('gives the quest item on accept for deliver_item and awards personal reward on delivery', async () => {
    const player1 = createPlayer({ id: 'barbarian', location: { id: 10, description: '', move: [] }, coins: 10, points: 0 });
    const player2 = createPlayer({ id: 'mage', location: { id: 10, description: '', move: [] }, coins: 20, points: 0 });
    const gameState = createGame({
      gameId: 'cauldronfire',
      players: [player1, player2],
    });
    const locationsState = createLocations();
    const playerInventory = { equipped: null, equipment: null, hiredNpcIds: [] };

    const quest: QuestInstance = {
      id: 'q-deliver',
      templateId: 'deliver-gate-to-se-village',
      title: 'Urgent Dispatch',
      description: 'Deliver the Royal Ledger.',
      category: 'deliver_item',
      scope: 'player',
      assignedPlayerId: 'barbarian',
      tier: 'early',
      status: 'available',
      offerLocation: 10,
      destinationLocation: 22,
      itemType: SpecialIds.questRoyalLedger,
      reward: { coins: 40, points: 80, itemId: EquipableIds.axeBattle },
    };

    activateQuest(quest, player1, gameState, locationsState, playerInventory);
    expect(quest.status).toBe('active');
    expect(quest.assignedPlayerId).toBe('barbarian');
    expect(player1.equipment).toContainEqual(
      expect.objectContaining({ id: quest.spawnedItemId, type: SpecialIds.questRoyalLedger }),
    );
    expect(playerInventory.equipment).toContainEqual(
      expect.objectContaining({ id: quest.spawnedItemId, type: SpecialIds.questRoyalLedger }),
    );

    // Move player1 to destination 22
    player1.location.id = 22;
    saveQuestsState(gameState, { quests: [quest] });
    const params = createParams({ gameState, ...locationsState });
    await questProcess.executeForTurn!(params);

    const updated = getQuestsState(params.gameState).quests[0];
    expect(updated.status).toBe('completed');
    expect(player1.equipment.some(i => i.id === quest.spawnedItemId)).toBe(false);
    expect(player1.equipment.some(i => i.type === EquipableIds.axeBattle)).toBe(true);
    // Personal quest only rewards player1
    expect(player1.coins).toBe(50);
    expect(player2.coins).toBe(20);
  });

  it('spawns a follower NPC on escort_npc, completes on arrival, or fails if the NPC dies', async () => {
    const player1 = createPlayer({ id: 'barbarian', location: { id: 10, description: '', move: [] }, coins: 0, points: 0 });
    const gameState = createGame({ gameId: 'cauldronfire', players: [player1] });
    const locationsState = createLocations();

    const quest: QuestInstance = {
      id: 'q-escort',
      templateId: 'escort-pilgrim',
      title: 'Escort Brother Aldous',
      description: 'Escort Brother Aldous to Location 23.',
      category: 'escort_npc',
      scope: 'player',
      assignedPlayerId: 'barbarian',
      tier: 'early',
      status: 'available',
      offerLocation: 10,
      destinationLocation: 23,
      npcName: 'Brother Aldous',
      npcCharacterType: 'mage',
      npcIconXY: { x: 0, y: 0 },
      reward: { coins: 45, points: 90 },
    };

    activateQuest(quest, player1, gameState, locationsState);
    expect(gameState.npcs).toHaveLength(1);
    const spawnedNpc = gameState.npcs[0];
    expect(spawnedNpc.masterId).toBe('barbarian');
    expect(spawnedNpc.team).toBe('good');

    // Arrive at destination 23 alive
    player1.location.id = 23;
    spawnedNpc.location.id = 23;
    saveQuestsState(gameState, { quests: [quest] });

    const params = createParams({ gameState, ...locationsState });
    await questProcess.executeForTurn!(params);

    const updated = getQuestsState(params.gameState).quests[0];
    expect(updated.status).toBe('completed');
    expect(params.gameState.npcs).toHaveLength(0);
    expect(player1.coins).toBe(45);
  });

  it('marks escort_npc quest as failed and removes NPC if the NPC dies', async () => {
    const player1 = createPlayer({ id: 'barbarian', location: { id: 10, description: '', move: [] } });
    const gameState = createGame({ gameId: 'cauldronfire', players: [player1] });
    const locationsState = createLocations();

    const quest: QuestInstance = {
      id: 'q-escort-fail',
      templateId: 'escort-pilgrim',
      title: 'Escort Sister Clara',
      description: 'Escort Sister Clara to Location 23.',
      category: 'escort_npc',
      scope: 'player',
      assignedPlayerId: 'barbarian',
      tier: 'early',
      status: 'available',
      offerLocation: 10,
      destinationLocation: 23,
      npcName: 'Sister Clara',
      npcCharacterType: 'witch',
      reward: { coins: 45, points: 90 },
    };

    activateQuest(quest, player1, gameState, locationsState);
    gameState.npcs[0].health = 0;
    saveQuestsState(gameState, { quests: [quest] });

    const params = createParams({ gameState, ...locationsState });
    await questProcess.executeForTurn!(params);

    const updated = getQuestsState(params.gameState).quests[0];
    expect(updated.status).toBe('failed');
    expect(params.gameState.npcs).toHaveLength(0);
  });

  it('handles rescue_npc from finding the captive to escorting them to destination', async () => {
    const player1 = createPlayer({ id: 'barbarian', location: { id: 38, description: '', move: [] }, coins: 0, points: 0 });
    const gameState = createGame({ gameId: 'cauldronfire', players: [player1] });
    const locationsState = createLocations();

    const quest: QuestInstance = {
      id: 'q-rescue',
      templateId: 'rescue-miner',
      title: 'Rescue Foreman Duggan',
      description: 'Rescue Foreman Duggan from Location 35 and bring him to 38.',
      category: 'rescue_npc',
      scope: 'shared',
      tier: 'early',
      status: 'available',
      offerLocation: 38,
      actualTargetLocation: 35,
      hintLocations: [35, 36],
      destinationLocation: 38,
      npcName: 'Foreman Duggan',
      npcCharacterType: 'barbarian',
      reward: { coins: 60, points: 120 },
    };

    activateQuest(quest, player1, gameState, locationsState);
    expect(gameState.npcs[0].masterId).toBeNull();
    expect(gameState.npcs[0].location.id).toBe(35);

    // Player reaches location 35 -> NPC joins player
    player1.location.id = 35;
    saveQuestsState(gameState, { quests: [quest] });
    const params1 = createParams({ gameState, ...locationsState });
    await questProcess.executeForTurn!(params1);

    expect(params1.gameState.npcs[0].masterId).toBe('barbarian');
    expect(getQuestsState(params1.gameState).quests[0].npcRescued).toBe(true);
    expect(getQuestsState(params1.gameState).quests[0].status).toBe('active');

    // Player and NPC return to destination 38 -> quest completes
    player1.location.id = 38;
    params1.gameState.npcs[0].location.id = 38;
    await questProcess.executeForTurn!(params1);

    expect(getQuestsState(params1.gameState).quests[0].status).toBe('completed');
    expect(params1.gameState.npcs).toHaveLength(0);
    expect(player1.coins).toBe(60);
  });

  it('spawns monsters on clear_dungeon, slay_boss, and tracks scout_area completion', async () => {
    const player1 = createPlayer({ id: 'barbarian', location: { id: 38, description: '', move: [] }, coins: 0, points: 0 });
    const gameState = createGame({ gameId: 'cauldronfire', players: [player1] });
    const locationsState = createLocations({ monsters: [] });

    const clearQuest: QuestInstance = {
      id: 'q-clear',
      templateId: 'clear-sw-mine',
      title: 'Clear the Mine',
      description: 'Clear Locations 35, 36.',
      category: 'clear_dungeon',
      scope: 'shared',
      tier: 'early',
      status: 'available',
      offerLocation: 38,
      targetLocations: [35, 36],
      reward: { coins: 50, points: 100 },
    };

    const bossQuest: QuestInstance = {
      id: 'q-boss',
      templateId: 'boss-mine-troll',
      title: 'Slay Stonecrusher',
      description: 'Slay Stonecrusher at 37.',
      category: 'slay_boss',
      scope: 'shared',
      tier: 'early',
      status: 'available',
      offerLocation: 38,
      actualTargetLocation: 37,
      hintLocations: [35, 37],
      monsterType: 'troll',
      bossName: 'Stonecrusher (Troll)',
      reward: { coins: 70, points: 140 },
    };

    const scoutQuest: QuestInstance = {
      id: 'q-scout',
      templateId: 'scout-frontier',
      title: 'Scout Frontier',
      description: 'Visit 7 and 16.',
      category: 'scout_area',
      scope: 'player',
      assignedPlayerId: 'barbarian',
      tier: 'early',
      status: 'available',
      offerLocation: 38,
      targetLocations: [7, 16],
      scoutedLocations: [],
      reward: { coins: 30, points: 60 },
    };

    activateQuest(clearQuest, player1, gameState, locationsState);
    activateQuest(bossQuest, player1, gameState, locationsState);
    activateQuest(scoutQuest, player1, gameState, locationsState);

    expect(locationsState.monsters.filter(m => [35, 36].includes(m.location)).length).toBeGreaterThanOrEqual(3);
    const bossMonster = locationsState.monsters.find(m => m.id === bossQuest.spawnedMonsterId);
    expect(bossMonster).toBeDefined();
    expect(bossMonster?.location).toBe(37);

    // Defeat all monsters and visit scout locations
    for (const m of locationsState.monsters) {
      m.health = 0;
    }
    scoutQuest.scoutedLocations = [7];
    player1.location.id = 16;
    saveQuestsState(gameState, { quests: [clearQuest, bossQuest, scoutQuest] });

    const params = createParams({ gameState, ...locationsState, monsters: locationsState.monsters });
    await questProcess.executeForTurn!(params);

    const finalQuests = getQuestsState(params.gameState).quests;
    expect(finalQuests.map(q => q.status)).toEqual(['completed', 'completed', 'completed']);
    expect(player1.coins).toBe(50 + 70 + 30);
  });
});
