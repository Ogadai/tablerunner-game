import {
  handleChestPickup,
  isEasierLocation,
  getAreaDifficulty,
  calculateChestCoins,
  calculateMonsterCoinDropForArea,
  getLootItemPool,
} from './chest-pickup';
import { createGame, createLocations, createPlayer } from '../store/test-support/fixtures';
import { SpecialIds } from '../games/items';
import * as redis from '../store/redis-access';
import { publishMessage } from '../messages/message-publisher';
import { GameTopicMessageType } from '../message-types';
import { PlayerInventoryState } from '../store/types';

jest.mock('../store/redis-access', () => ({
  getPlayerMessagesFromRedis: jest.fn(),
  setPlayerMessagesInRedis: jest.fn(),
  setLocationsStateInRedis: jest.fn(),
  setGameStateInRedis: jest.fn(),
  getPlayerInventoryFromRedis: jest.fn(),
  setPlayerInventoryInRedis: jest.fn(),
}));

jest.mock('../messages/message-publisher', () => ({
  publishMessage: jest.fn(),
}));

describe('chest-pickup', () => {
  let game: ReturnType<typeof createGame>;
  let locations: ReturnType<typeof createLocations>;
  let inventory: PlayerInventoryState;

  beforeEach(() => {
    jest.clearAllMocks();
    game = createGame();
    locations = createLocations();
    inventory = { equipped: {}, equipment: [], coins: 10 };
    jest.mocked(redis.getPlayerMessagesFromRedis).mockImplementation(() => Promise.resolve({ messages: [] }));
    jest.mocked(redis.setPlayerMessagesInRedis).mockResolvedValue();
    jest.mocked(redis.setLocationsStateInRedis).mockResolvedValue();
    jest.mocked(redis.setGameStateInRedis).mockResolvedValue();
    jest.mocked(redis.getPlayerInventoryFromRedis).mockResolvedValue({ equipped: {}, equipment: [], hiredNpcIds: [] });
    jest.mocked(redis.setPlayerInventoryInRedis).mockResolvedValue();
    jest.mocked(publishMessage).mockResolvedValue();
  });

  describe('isEasierLocation', () => {
    it('returns true for locations in the bottom half of the map (rows 0 to 5)', () => {
      // Cell 10 is row 0
      expect(isEasierLocation(10)).toBe(true);
      // Cell 35 is row 1
      expect(isEasierLocation(35)).toBe(true);
      // Cell 120 is row 5
      expect(isEasierLocation(120)).toBe(true);
    });

    it('returns false for locations in the top half of the map (rows 6 to 11)', () => {
      // Cell 121 is row 6
      expect(isEasierLocation(121)).toBe(false);
      // Cell 200 is row 10
      expect(isEasierLocation(200)).toBe(false);
      // Cell 240 is row 11
      expect(isEasierLocation(240)).toBe(false);
    });
  });

  describe('coin and loot scaling', () => {
    it('scales monster coin drop by area difficulty', () => {
      const easyDrop = calculateMonsterCoinDropForArea('easy', 0.5);
      const mediumDrop = calculateMonsterCoinDropForArea('medium', 0.5);
      const hardDrop = calculateMonsterCoinDropForArea('hard', 0.5);

      expect(easyDrop).toBeLessThan(mediumDrop);
      expect(mediumDrop).toBeLessThan(hardDrop);
    });

    it('calculates chest coins as 5 to 10 times monster drops', () => {
      for (const diff of ['easy', 'medium', 'hard'] as const) {
        const minCoins = calculateChestCoins(diff, { coinRoll: 0.5, multiplierRoll: 0.0 });
        const maxCoins = calculateChestCoins(diff, { coinRoll: 0.5, multiplierRoll: 1.0 });
        const baseDrop = calculateMonsterCoinDropForArea(diff, 0.5);

        expect(minCoins).toBe(Math.round(baseDrop * 5));
        expect(maxCoins).toBe(Math.round(baseDrop * 10));
        expect(maxCoins).toBeGreaterThan(minCoins);
      }
    });

    it('provides appropriate loot item pools for similar vs high tier in each difficulty', () => {
      const easySimilar = getLootItemPool('easy', false);
      const easyHigh = getLootItemPool('easy', true);
      expect(easySimilar.every(i => (i.value ?? 0) <= 50)).toBe(true);
      expect(easyHigh.every(i => (i.value ?? 0) >= 60)).toBe(true);

      const medSimilar = getLootItemPool('medium', false);
      const medHigh = getLootItemPool('medium', true);
      expect(medSimilar.every(i => (i.value ?? 0) >= 25 && (i.value ?? 0) <= 150)).toBe(true);
      expect(medHigh.every(i => (i.value ?? 0) >= 160)).toBe(true);

      const hardSimilar = getLootItemPool('hard', false);
      const hardHigh = getLootItemPool('hard', true);
      expect(hardSimilar.every(i => (i.value ?? 0) >= 90)).toBe(true);
      expect(hardHigh.every(i => (i.value ?? 0) >= 200)).toBe(true);
    });
  });

  describe('handleChestPickup - 25% Mimic outcome', () => {
    it('spawns a Juvenile Mimic in easier locations (bottom half)', async () => {
      // Location 10 is row 0 (bottom half)
      game.players[0].location = { id: 10, description: '', move: [] };
      const chestItem = { id: 'c-1', type: SpecialIds.chest, location: 10 };
      locations.items = [chestItem];

      const res = await handleChestPickup({
        boardId: 'b1',
        mapId: 'm1',
        playerId: game.players[0].id,
        chestItem,
        playerState: game.players[0],
        playerInventory: inventory,
        gameState: game,
        locationsState: locations,
        options: { outcomeRoll: 0.1 }, // < 0.25 -> Mimic
      });

      expect(res.success).toBe(true);
      // Chest is removed
      expect(locations.items.find(i => i.id === 'c-1')).toBeUndefined();
      // Chest not added to player inventory
      expect(inventory.equipment).toEqual([]);

      // Spawns Juvenile Mimic
      const spawned = locations.monsters.find(m => m.location === 10);
      expect(spawned).toBeDefined();
      expect(spawned?.type).toBe('juvenilemimic');
      expect(spawned?.health).toBe(11);
      expect(spawned?.team).toBe('monster');

      // Save game state without full refresh
      expect(redis.setGameStateInRedis).toHaveBeenCalledWith('b1', 'm1', game, { notify: false });
      expect(redis.setLocationsStateInRedis).toHaveBeenCalledWith('b1', 'm1', locations);
      expect(publishMessage).toHaveBeenCalledWith('b1', 'm1', {
        type: GameTopicMessageType.MimicWarning,
        locationId: 10,
        openerPlayerId: game.players[0].id,
        openerPlayerName: game.players[0].name,
        monsterName: 'Juvenile Mimic',
        monsterType: 'juvenilemimic',
      });
      expect(publishMessage).toHaveBeenCalledWith('b1', 'm1', {
        type: GameTopicMessageType.LocationUpdated,
        locationId: 10,
      });
    });

    it('spawns a regular Mimic in harder locations (top half)', async () => {
      // Location 240 is row 11 (top half)
      game.players[0].location = { id: 240, description: '', move: [] };
      const chestItem = { id: 'c-2', type: SpecialIds.chest, location: 240 };
      locations.items = [chestItem];

      const res = await handleChestPickup({
        boardId: 'b1',
        mapId: 'm1',
        playerId: game.players[0].id,
        chestItem,
        playerState: game.players[0],
        playerInventory: inventory,
        gameState: game,
        locationsState: locations,
        options: { outcomeRoll: 0.2 }, // < 0.25 -> Mimic
      });

      expect(res.success).toBe(true);
      const spawned = locations.monsters.find(m => m.location === 240);
      expect(spawned).toBeDefined();
      expect(spawned?.type).toBe('mimic');
      expect(spawned?.health).toBe(24);
      expect(spawned?.team).toBe('monster');

      expect(publishMessage).toHaveBeenCalledWith('b1', 'm1', {
        type: GameTopicMessageType.MimicWarning,
        locationId: 240,
        openerPlayerId: game.players[0].id,
        openerPlayerName: game.players[0].name,
        monsterName: 'Mimic',
        monsterType: 'mimic',
      });
    });

    it('publishes a mimic warning topic message and location update without writing to player messages or full game state refresh', async () => {
      const opener = game.players[0]; // Hero
      opener.location = { id: 10, description: '', move: [] };
      const allyAtLocation = createPlayer({ id: 'ally', name: 'Mage', location: { id: 10, description: '', move: [] } });
      const distantPlayer = createPlayer({ id: 'distant', name: 'Ranger', location: { id: 200, description: '', move: [] } });
      game.players.push(allyAtLocation, distantPlayer);

      const chestItem = { id: 'c-3', type: SpecialIds.chest, location: 10 };
      locations.items = [chestItem];

      await handleChestPickup({
        boardId: 'b1',
        mapId: 'm1',
        playerId: opener.id,
        chestItem,
        playerState: opener,
        playerInventory: inventory,
        gameState: game,
        locationsState: locations,
        options: { outcomeRoll: 0.05 },
      });

      // Does NOT write to player messages in redis (prevents message popup and battle replay loop)
      expect(redis.setPlayerMessagesInRedis).not.toHaveBeenCalled();

      // Does NOT trigger full GameState update
      expect(redis.setGameStateInRedis).toHaveBeenCalledWith('b1', 'm1', game, { notify: false });

      // Publishes mimic warning topic message and location update
      expect(publishMessage).toHaveBeenCalledWith('b1', 'm1', {
        type: GameTopicMessageType.MimicWarning,
        locationId: 10,
        openerPlayerId: opener.id,
        openerPlayerName: opener.name,
        monsterName: 'Juvenile Mimic',
        monsterType: 'juvenilemimic',
      });
      expect(publishMessage).toHaveBeenCalledWith('b1', 'm1', {
        type: GameTopicMessageType.LocationUpdated,
        locationId: 10,
      });
    });
  });

  describe('handleChestPickup - 75% Loot outcome', () => {
    it('replaces chest with 3-5 similar level items and adds coins directly to players at the location without sharing', async () => {
      const opener = game.players[0]; // Hero
      opener.location = { id: 10, description: '', move: [] };
      opener.coins = 20;

      const allyAtLocation = createPlayer({ id: 'ally', name: 'Mage', location: { id: 10, description: '', move: [] }, coins: 30 });
      const distantPlayer = createPlayer({ id: 'distant', name: 'Ranger', location: { id: 200, description: '', move: [] }, coins: 50 });
      game.players.push(allyAtLocation, distantPlayer);

      const chestItem = { id: 'c-loot', type: SpecialIds.chest, location: 10 };
      locations.items = [chestItem];

      const res = await handleChestPickup({
        boardId: 'b1',
        mapId: 'm1',
        playerId: opener.id,
        chestItem,
        playerState: opener,
        playerInventory: inventory,
        gameState: game,
        locationsState: locations,
        options: {
          outcomeRoll: 0.5, // >= 0.25 -> Loot
          highTierRoll: 0.2, // < 0.5 -> 3-5 similar tier items
          countRoll: 0.0, // minimum count: 3 items
          coinRoll: 0.5,
          multiplierRoll: 0.5,
        },
      });

      expect(res.success).toBe(true);
      // Chest removed
      expect(locations.items.find(i => i.id === 'c-loot')).toBeUndefined();
      // Not added to inventory equipment
      expect(inventory.equipment).toEqual([]);

      // Loot items added to location (no coin item)
      const newItemsAtLoc = locations.items.filter(i => i.location === 10);
      expect(newItemsAtLoc).toHaveLength(3);

      // Coins added directly to players at the location: they each get 100%, don't share
      const coinsAdded = inventory.coins! - 10; // initial inventory.coins was 10
      expect(coinsAdded).toBeGreaterThan(0);
      expect(opener.coins).toBe(20 + coinsAdded);
      expect(allyAtLocation.coins).toBe(30 + coinsAdded); // ally also gets 100%!
      expect(distantPlayer.coins).toBe(50); // distant player receives nothing

      // Opener's inventory persisted with new coins
      expect(redis.setPlayerInventoryInRedis).toHaveBeenCalledWith(
        'b1', 'm1', opener.id, expect.objectContaining({ coins: 10 + coinsAdded }),
      );
      // Ally's inventory persisted with new coins
      expect(redis.setPlayerInventoryInRedis).toHaveBeenCalledWith(
        'b1', 'm1', allyAtLocation.id, expect.objectContaining({ coins: 30 + coinsAdded }),
      );

      // NO full game state update ({ notify: false })
      expect(redis.setGameStateInRedis).toHaveBeenCalledWith('b1', 'm1', game, { notify: false });
      expect(redis.setLocationsStateInRedis).toHaveBeenCalledWith('b1', 'm1', locations);
      expect(publishMessage).toHaveBeenCalledWith('b1', 'm1', {
        type: GameTopicMessageType.LocationUpdated,
        locationId: 10,
      });
    });

    it('replaces chest with 1-2 significantly higher level items when high tier roll succeeds', async () => {
      game.players[0].location = { id: 10, description: '', move: [] };
      const chestItem = { id: 'c-loot-2', type: SpecialIds.chest, location: 10 };
      locations.items = [chestItem];

      const res = await handleChestPickup({
        boardId: 'b1',
        mapId: 'm1',
        playerId: game.players[0].id,
        chestItem,
        playerState: game.players[0],
        playerInventory: inventory,
        gameState: game,
        locationsState: locations,
        options: {
          outcomeRoll: 0.8, // >= 0.25 -> Loot
          highTierRoll: 0.9, // >= 0.5 -> 1-2 high tier items
          countRoll: 0.0, // 1 item
          coinRoll: 0.5,
          multiplierRoll: 1.0, // 10x multiplier
        },
      });

      expect(res.success).toBe(true);
      const newItemsAtLoc = locations.items.filter(i => i.location === 10);
      expect(newItemsAtLoc).toHaveLength(1);
    });

    it('persists coins for nearby players whose inventory had no prior coin value', async () => {
      const opener = game.players[0];
      const ally = createPlayer({ id: 'ally', name: 'Mage', location: opener.location, coins: 25 });
      game.players.push(ally);
      const chestItem = { id: 'c_undef', type: SpecialIds.chest, location: opener.location.id };
      locations.items.push(chestItem);

      // Return an inventory with coins: undefined
      jest.mocked(redis.getPlayerInventoryFromRedis).mockResolvedValue({
        equipped: null,
        equipment: null,
        hiredNpcIds: [],
      });

      const res = await handleChestPickup({
        boardId: 'b1',
        mapId: 'm1',
        playerId: opener.id,
        chestItem,
        playerState: opener,
        playerInventory: inventory,
        gameState: game,
        locationsState: locations,
        options: {
          outcomeRoll: 0.9,
          coinRoll: 0.5,
          multiplierRoll: 0.5,
        },
      });

      expect(res.success).toBe(true);
      expect(ally.coins).toBeGreaterThan(25);
      expect(redis.setPlayerInventoryInRedis).toHaveBeenCalledWith(
        'b1', 'm1', ally.id, expect.objectContaining({ coins: ally.coins }),
      );
    });

    it('preserves existing pending inventory coins for nearby players and adds the reward', async () => {
      const opener = game.players[0];
      const ally = createPlayer({ id: 'ally', name: 'Mage', location: opener.location, coins: 50 });
      game.players.push(ally);
      const chestItem = { id: 'c_pending', type: SpecialIds.chest, location: opener.location.id };
      locations.items.push(chestItem);

      // Return an inventory with existing pending coins: 30 (e.g. spent 20 this turn)
      jest.mocked(redis.getPlayerInventoryFromRedis).mockResolvedValue({
        equipped: null,
        equipment: null,
        hiredNpcIds: [],
        coins: 30,
      });

      const res = await handleChestPickup({
        boardId: 'b1',
        mapId: 'm1',
        playerId: opener.id,
        chestItem,
        playerState: opener,
        playerInventory: inventory,
        gameState: game,
        locationsState: locations,
        options: {
          outcomeRoll: 0.9,
          coinRoll: 0.5,
          multiplierRoll: 0.5,
        },
      });

      expect(res.success).toBe(true);
      const rewardCoins = ally.coins - 50;
      expect(rewardCoins).toBeGreaterThan(0);
      expect(redis.setPlayerInventoryInRedis).toHaveBeenCalledWith(
        'b1', 'm1', ally.id, expect.objectContaining({ coins: 30 + rewardCoins }),
      );
    });

    it('never spawns a mimic and always provides high-tier loot for a locked chest', async () => {
      const opener = createPlayer({ id: 'p1', location: { id: 10, description: '', move: [] } });
      game.players.push(opener);
      const lockedChest = { id: 'c_locked', type: SpecialIds.chest, location: opener.location.id, key: 'goldKey' };
      locations.items.push(lockedChest);

      // Force outcomeRoll: 0 (normally mimic) and highTierRoll: 0 (normally low tier)
      const res = await handleChestPickup({
        boardId: 'b1',
        mapId: 'm1',
        playerId: opener.id,
        chestItem: lockedChest,
        playerState: opener,
        playerInventory: inventory,
        gameState: game,
        locationsState: locations,
        options: {
          outcomeRoll: 0.0,
          highTierRoll: 0.0,
          countRoll: 0.0,
          itemRolls: [0.0],
        },
      });

      expect(res.success).toBe(true);
      // No mimic monster spawned
      expect(locations.monsters).toHaveLength(0);
      // High tier loot placed
      expect(locations.items.length).toBeGreaterThanOrEqual(1);
      const highTierPool = getLootItemPool('easy', true);
      const droppedItem = locations.items[0];
      expect(highTierPool.some(def => def.id === droppedItem.type)).toBe(true);
    });
  });
});
