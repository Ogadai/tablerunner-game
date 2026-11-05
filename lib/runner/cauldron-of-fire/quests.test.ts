/** @jest-environment node */
import { EquipableIds, SpecialIds, allItems } from '@/lib/games/items';
import { createLocations } from '@/lib/store/test-support/fixtures';
import { createGame, createParams, createPlayer } from '../test-support/fixtures';
import { QuestInstance } from './quest-types';
import {
  activateQuest,
  getQuestsState,
  MAIN_QUEST_ID,
  QUEST_LED_OWNER,
  QUEST_LED_RGB,
  questProcess,
  saveQuestsState,
  updateQuestLeds,
} from './quests';
import {
  areLocationsNeighbours,
  generateQuestsForGame,
  getLocationDistance,
  getMapSector,
  getNeighbourLocations,
  QUEST_TEMPLATES,
} from './quest-templates';
import { getCellCoordinates } from '@/lib/games/gridCells';

describe('Cauldron of Fire Quests', () => {
  it('identifies neighbouring locations correctly via movement moves and grid adjacency', () => {
    // 1 and 2 are adjacent connected cave rooms
    expect(areLocationsNeighbours(1, 2)).toBe(true);
    // 4 and 5 are connected road locations
    expect(areLocationsNeighbours(4, 5)).toBe(true);
    // 1 and 224 are on opposite sides of the map (SW cave vs North castle)
    expect(areLocationsNeighbours(1, 224)).toBe(false);
    expect(getLocationDistance(1, 224)).toBeGreaterThan(10);

    const neighboursOf1 = getNeighbourLocations(1);
    expect(neighboursOf1.has(2)).toBe(true);
    expect(neighboursOf1.has(224)).toBe(false);
  });

  it('ensures no two quests share the same offer location, including the main quest', async () => {
    for (let i = 0; i < 15; i++) {
      const params = createParams({
        gameState: createGame({ gameId: 'cauldronfire' }),
      });
      await questProcess.setup!(params);
      const state = getQuestsState(params.gameState);

      const offerLocations = state.quests.map(q => q.offerLocation);
      expect(new Set(offerLocations).size).toBe(offerLocations.length);

      // Main quest is at location 224 and no other quest should be at 224
      const at224 = state.quests.filter(q => q.offerLocation === 224);
      expect(at224.length).toBe(1);
      expect(at224[0].id).toBe(MAIN_QUEST_ID);
    }
  });

  it('distributes quests reasonably across all quadrants and sectors without clumping', async () => {
    for (let run = 0; run < 10; run++) {
      const quests = generateQuestsForGame(24, 26);
      const quadrantCounts = [0, 0, 0, 0];
      const sectorCounts = [0, 0, 0, 0, 0, 0];

      for (const q of quests) {
        const { row, col } = getCellCoordinates(q.offerLocation);
        const rQuad = row < 6 ? 0 : 1;
        const cQuad = col < 10 ? 0 : 1;
        quadrantCounts[rQuad * 2 + cQuad]++;

        sectorCounts[getMapSector(q.offerLocation)]++;
      }

      // Every quadrant must have multiple quests (no quadrant empty or neglected)
      for (const count of quadrantCounts) {
        expect(count).toBeGreaterThanOrEqual(3);
        // No quadrant should hoard more than 50% of the total quests
        expect(count).toBeLessThanOrEqual(quests.length * 0.5);
      }

      // All 6 sectors across South and North, West, Center and East must have quests
      for (const count of sectorCounts) {
        expect(count).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('limits neighbouring quest locations and spreads them out across the map', async () => {
    let totalZeroNeighbours = 0;
    let totalQuestsChecked = 0;
    let maxNeighboursObserved = 0;

    for (let run = 0; run < 15; run++) {
      const params = createParams({
        gameState: createGame({ gameId: 'cauldronfire' }),
      });
      await questProcess.setup!(params);
      const state = getQuestsState(params.gameState);

      for (const quest of state.quests) {
        totalQuestsChecked++;
        const neighbours = getNeighbourLocations(quest.offerLocation);
        const neighbourQuests = state.quests.filter(
          other => other.id !== quest.id && neighbours.has(other.offerLocation),
        );

        if (neighbourQuests.length > maxNeighboursObserved) {
          maxNeighboursObserved = neighbourQuests.length;
        }

        // Dense clustering is prevented: no quest location is surrounded by 3 or more quest neighbours
        expect(neighbourQuests.length).toBeLessThanOrEqual(2);

        if (neighbourQuests.length === 0) {
          totalZeroNeighbours++;
        }
      }
    }

    // Over 80% of quests have 0 neighbouring quest locations, effectively spreading them out
    const isolatedRatio = totalZeroNeighbours / totalQuestsChecked;
    expect(isolatedRatio).toBeGreaterThan(0.8);
  });
  it('generates between 22 and 28 quests with 2-3 character-specific personal quests per character and the remainder shared', async () => {
    const params = createParams({
      gameState: createGame({ gameId: 'cauldronfire' }),
    });

    await questProcess.setup!(params);
    const state = getQuestsState(params.gameState);

    expect(state.quests.length).toBeGreaterThanOrEqual(23);
    expect(state.quests.length).toBeLessThanOrEqual(29);

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

    const mainQuest = state.quests[0];
    expect(mainQuest.id).toBe(MAIN_QUEST_ID);
    expect(mainQuest.title).toBe('Defeat the Lich King');
    expect(mainQuest.isMainQuest).toBe(true);
    expect(mainQuest.status).toBe('active');
    expect(mainQuest.actualTargetLocation).toBe(224);

    expect(params.gameState.leds).toContainEqual(
      expect.objectContaining({
        location: 224,
        rgb: QUEST_LED_RGB,
        owner: QUEST_LED_OWNER,
      }),
    );

    for (const q of state.quests.slice(1)) {
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

  it('completes the "Defeat the Lich King" main story quest when the lich king is defeated', async () => {
    const player1 = createPlayer({ id: 'barbarian', location: { id: 224, description: '', move: [] }, coins: 0, points: 0 });
    const player2 = createPlayer({ id: 'witch', location: { id: 224, description: '', move: [] }, coins: 0, points: 0 });
    const gameState = createGame({
      gameId: 'cauldronfire',
      players: [player1, player2],
    });

    const params = createParams({
      gameState,
      monsters: [
        {
          id: 'lich-king',
          type: 'lich',
          location: 224,
          health: 30,
          team: 'monster',
        },
      ],
    });

    await questProcess.setup!(params);
    const mainQuestBefore = getQuestsState(params.gameState).quests.find(q => q.id === MAIN_QUEST_ID);
    expect(mainQuestBefore?.status).toBe('active');

    // Defeat the Lich King
    params.monsters.find(m => m.id === 'lich-king')!.health = 0;

    await questProcess.executeForTurn!(params);

    const mainQuestAfter = getQuestsState(params.gameState).quests.find(q => q.id === MAIN_QUEST_ID);
    expect(mainQuestAfter?.status).toBe('completed');
    expect(player1.coins).toBe(500);
    expect(player2.coins).toBe(500);
    expect(player1.points).toBe(1000);
    expect(player2.points).toBe(1000);
  });

  it('shows LEDs for target locations of active quests, lighting return/destination locations even if visited', () => {
    const player1 = createPlayer({ id: 'barbarian', location: { id: 10, description: '', move: [] } });
    const gameState = createGame({
      gameId: 'cauldronfire',
      players: [player1],
      visited: [10],
      leds: [],
    });

    const activeQuest1: QuestInstance = {
      id: 'q-active-1',
      templateId: 'retrieve-item',
      title: 'Retrieve Treasure',
      description: 'Find item at 18 or 20, then return to 10',
      category: 'retrieve_item',
      scope: 'shared',
      tier: 'early',
      status: 'active',
      offerLocation: 10,
      actualTargetLocation: 18,
      hintLocations: [18, 20],
      itemType: SpecialIds.questRelicSkull,
      spawnedItemId: 'item-relic-1',
      reward: { coins: 50, points: 100 },
    };

    const activeQuest2: QuestInstance = {
      id: 'q-active-2',
      templateId: 'deliver-item',
      title: 'Deliver Supplies',
      description: 'Deliver to 22',
      category: 'deliver_item',
      scope: 'shared',
      tier: 'early',
      status: 'active',
      offerLocation: 10,
      destinationLocation: 22,
      reward: { coins: 40, points: 80 },
    };

    saveQuestsState(gameState, { quests: [activeQuest1, activeQuest2] });
    updateQuestLeds(gameState);

    // activeQuest1 hints (18, 20) are unvisited -> lit
    // activeQuest2 destination (22) is unvisited -> lit
    const questLeds = gameState.leds.filter(l => l.owner === QUEST_LED_OWNER);
    const litLocations = questLeds.map(l => l.location).sort((a, b) => a - b);
    expect(litLocations).toEqual([18, 20, 22]);
    for (const led of questLeds) {
      expect(led.rgb).toBe(QUEST_LED_RGB);
    }

    // Now visit location 18 (hint search location) and location 22 (delivery destination)
    gameState.visited.push(18, 22);
    updateQuestLeds(gameState);

    // 18 is an unvisited-only search hint -> unlit when visited
    // 20 is still an unvisited search hint -> stays lit
    // 22 is a delivery destination that still needs to be visited to complete -> STAYS lit even though visited!
    const updatedLeds = gameState.leds.filter(l => l.owner === QUEST_LED_OWNER);
    const updatedLocations = updatedLeds.map(l => l.location).sort((a, b) => a - b);
    expect(updatedLocations).toEqual([20, 22]);

    // Player picks up the quest item: now retrieve quest requires returning to offerLocation 10!
    // Return location 10 was already visited when collecting the quest, but lights up anyway!
    player1.equipment.push({ id: 'item-relic-1', type: SpecialIds.questRelicSkull });
    updateQuestLeds(gameState);

    const carryingLeds = gameState.leds.filter(l => l.owner === QUEST_LED_OWNER);
    const carryingLocations = carryingLeds.map(l => l.location).sort((a, b) => a - b);
    expect(carryingLocations).toEqual([10, 22]);

    // When quests complete, their LEDs turn off
    activeQuest1.status = 'completed';
    activeQuest2.status = 'completed';
    updateQuestLeds(gameState);

    const completedLeds = gameState.leds.filter(l => l.owner === QUEST_LED_OWNER);
    expect(completedLeds).toHaveLength(0);
  });

  it('assigns dedicated row 9 icons on item-sheet.png for all quest items distinct from player equipment', () => {
    const questItemIds = [
      SpecialIds.questRelicSkull,
      SpecialIds.questAlchemistBag,
      SpecialIds.questRoyalLedger,
      SpecialIds.questSunMedallion,
      SpecialIds.questMoonAmulet,
      SpecialIds.questGoldenCrest,
      SpecialIds.questSapphireScepter,
      SpecialIds.questEmeraldIdol,
      SpecialIds.questSacredChalice,
      SpecialIds.questDragonHorn,
    ];

    const nonQuestDefs = Object.values(allItems).filter(
      item => !questItemIds.includes(item.id as SpecialIds)
    );

    const nonQuestIconCoords = new Set(
      nonQuestDefs.filter(item => item.iconXY).map(item => `${item.iconXY.x},${item.iconXY.y}`)
    );

    const seenQuestCoords = new Set<string>();

    for (const questId of questItemIds) {
      const itemDef = allItems[questId];
      expect(itemDef).toBeDefined();
      expect(itemDef.iconXY).toBeDefined();
      expect(itemDef.iconXY.y).toBe(9);
      expect(itemDef.iconXY.x).toBeGreaterThanOrEqual(0);
      expect(itemDef.iconXY.x).toBeLessThan(10);

      const coordKey = `${itemDef.iconXY.x},${itemDef.iconXY.y}`;
      expect(seenQuestCoords.has(coordKey)).toBe(false);
      seenQuestCoords.add(coordKey);

      expect(nonQuestIconCoords.has(coordKey)).toBe(false);
    }
  });
});
