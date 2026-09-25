import { buyAndSellInStore, createStoreInventoryState, dropItemAtLocation, getPlayerInventory, getStoreInventoryState, hireNpc, playerEquipItem, takeItemAtLocation } from './playerInventory';
import * as redis from './redis-access';
import { publishMessage } from '../messages/message-publisher';
import { createGame, createLocations, createNpc } from './test-support/fixtures';
import { NOTHING_EQUPPED, type PlayerInventoryState, type StoreInventoryState } from './types';

jest.mock('./redis-access', () => ({
  getGameStateFromRedis: jest.fn(), getPlayerInventoryFromRedis: jest.fn(), getStoreStateFromRedis: jest.fn(),
  getLocationsStateFromRedis: jest.fn(), lockGameStateInRedis: jest.fn(), lockLocationsStateInRedis: jest.fn(),
  lockStoreStateInRedis: jest.fn(), setGameStateInRedis: jest.fn(), setLocationsStateInRedis: jest.fn(),
  setPlayerInventoryInRedis: jest.fn(), setStoreStateInRedis: jest.fn(),
}));
jest.mock('../messages/message-publisher', () => ({ publishMessage: jest.fn() }));
const storage = jest.mocked(redis);
const releaseGame = jest.fn<Promise<void>, []>();
const releaseLocations = jest.fn<Promise<void>, []>();
const releaseStore = jest.fn<Promise<void>, []>();
let game: ReturnType<typeof createGame>;
let locations: ReturnType<typeof createLocations>;
let inventory: PlayerInventoryState;
let store: StoreInventoryState;

beforeEach(() => {
  jest.resetAllMocks();
  game = createGame();
  locations = createLocations({ npcs: [createNpc()], items: [{ id: 'potion', type: 'healingPotion', location: 1 }] });
  inventory = { equipped: null, equipment: null };
  store = { items: [{ itemId: 'healingPotion', count: 2 }] };
  storage.getGameStateFromRedis.mockResolvedValue(game);
  storage.getLocationsStateFromRedis.mockResolvedValue(locations);
  storage.getPlayerInventoryFromRedis.mockResolvedValue(inventory);
  storage.getStoreStateFromRedis.mockResolvedValue(store);
  storage.lockGameStateInRedis.mockResolvedValue(releaseGame);
  storage.lockLocationsStateInRedis.mockResolvedValue(releaseLocations);
  storage.lockStoreStateInRedis.mockResolvedValue(releaseStore);
  releaseGame.mockResolvedValue();
  releaseLocations.mockResolvedValue();
  releaseStore.mockResolvedValue();
});

function expectNoWrites() {
  expect(storage.setPlayerInventoryInRedis).not.toHaveBeenCalled();
  expect(storage.setLocationsStateInRedis).not.toHaveBeenCalled();
  expect(storage.setStoreStateInRedis).not.toHaveBeenCalled();
  expect(storage.setGameStateInRedis).not.toHaveBeenCalled();
  expect(publishMessage).not.toHaveBeenCalled();
}

describe('inventory reads and store initialization', () => {
  it('returns the pending inventory and store stock', async () => {
    await expect(getPlayerInventory('board', 'map', 'hero')).resolves.toEqual({ success: true, data: inventory });
    expect(storage.getPlayerInventoryFromRedis).toHaveBeenCalledWith('board', 'map', 'hero');
    await expect(getStoreInventoryState('board', 'map', 1)).resolves.toEqual({ success: true, data: store });
    expect(storage.getStoreStateFromRedis).toHaveBeenCalledWith('board', 'map', 1);
  });

  it('reports read failures', async () => {
    storage.getPlayerInventoryFromRedis.mockRejectedValue(new Error('Read failed'));
    storage.getStoreStateFromRedis.mockRejectedValue(new Error('Read failed'));
    await expect(getPlayerInventory('board', 'map', 'hero')).resolves.toEqual({ success: false, error: 'Read failed' });
    await expect(getStoreInventoryState('board', 'map', 1)).resolves.toEqual({ success: false, error: 'Read failed' });
  });

  it('initializes stock and propagates initialization failures', async () => {
    await createStoreInventoryState('board', 'map', 1, ['swordRusty', 'healingPotion']);
    expect(storage.setStoreStateInRedis).toHaveBeenCalledWith('board', 'map', 1, {
      items: [{ itemId: 'swordRusty', count: 100 }, { itemId: 'healingPotion', count: 100 }],
    });
    storage.setStoreStateInRedis.mockRejectedValue(new Error('Write failed'));
    await expect(createStoreInventoryState('board', 'map', 1, [])).rejects.toThrow('Write failed');
  });
});

describe('equipping and dropping items', () => {
  it('equips persisted equipment while preserving other pending selections', async () => {
    inventory.equipped = { helmet: 'helmet' };
    await expect(playerEquipItem('board', 'map', 'hero', 'sword')).resolves.toEqual({
      success: true, data: { equipment: null, equipped: { helmet: 'helmet', weapon: 'sword' } },
    });
    expect(inventory.equipped).toEqual({ helmet: 'helmet' });
    expect(releaseGame).toHaveBeenCalledTimes(1);
  });

  it('uses pending equipment even when that list is empty', async () => {
    inventory.equipment = [];
    await expect(playerEquipItem('board', 'map', 'hero', 'sword')).resolves.toEqual({ success: true, data: { equipment: [], equipped: {} } });
  });

  it.each([undefined, 'replacement'])('drops equipment and only unequips it if still selected (%s)', async pendingWeapon => {
    if (pendingWeapon) inventory.equipped = { weapon: pendingWeapon };
    await expect(dropItemAtLocation('board', 'map', 'hero', 'sword')).resolves.toEqual({
      success: true, data: { equipment: [], equipped: { weapon: pendingWeapon ?? NOTHING_EQUPPED } },
    });
    expect(locations.items).toContainEqual({ id: 'sword', type: 'swordRusty', location: 1 });
    expect(storage.setPlayerInventoryInRedis).toHaveBeenCalledWith('board', 'map', 'hero', inventory);
    expect(storage.setLocationsStateInRedis).toHaveBeenCalledWith('board', 'map', locations);
    expect(publishMessage).toHaveBeenCalledWith('board', 'map', { type: 'location_updated', locationId: 1 });
    expect(game.players[0].equipment).toHaveLength(1);
    expect(releaseLocations).toHaveBeenCalledTimes(1);
    expect(releaseGame).toHaveBeenCalledTimes(1);
  });

  it('rejects dropping an item absent from pending inventory', async () => {
    inventory.equipment = [];
    await expect(dropItemAtLocation('board', 'map', 'hero', 'sword')).resolves.toEqual({ success: false, error: 'Item sword not found in inventory' });
    expectNoWrites();
    expect(releaseLocations).toHaveBeenCalledTimes(1);
    expect(releaseGame).toHaveBeenCalledTimes(1);
  });
});

describe('taking items', () => {
  it('takes a local item, preserving pending equipment and ignoring dead/distant monsters', async () => {
    inventory.equipment = [];
    inventory.equipped = { weapon: NOTHING_EQUPPED };
    locations.monsters = [
      { id: 'dead', type: 'rat', health: 0, location: 1 },
      { id: 'away', type: 'rat', health: 5, location: 2 },
    ];
    const item = locations.items[0];
    await expect(takeItemAtLocation('board', 'map', 'hero', 'potion')).resolves.toEqual({ success: true, data: { equipment: [item], equipped: { weapon: NOTHING_EQUPPED } } });
    expect(locations.items).toEqual([]);
    expect(storage.setLocationsStateInRedis).toHaveBeenCalledWith('board', 'map', locations);
    expect(storage.setPlayerInventoryInRedis).toHaveBeenCalledWith('board', 'map', 'hero', inventory);
    expect(publishMessage).toHaveBeenCalledWith('board', 'map', { type: 'location_updated', locationId: 1 });
    expect(releaseGame).toHaveBeenCalledTimes(1);
  });

  it('falls back to persisted inventory and equipment when there are no pending changes', async () => {
    await takeItemAtLocation('board', 'map', 'hero', 'potion');
    expect(inventory.equipment!.map(item => item.id)).toEqual(['sword', 'potion']);
    expect(inventory.equipped).toEqual({ weapon: 'sword' });
    expect(game.players[0].equipment).toHaveLength(1);
  });

  it.each(['enemy', 'distant item', 'missing item'])('rejects taking an item with %s', async scenario => {
    if (scenario === 'enemy') locations.monsters.push({ id: 'rat', type: 'rat', health: 1, location: 1 });
    if (scenario === 'distant item') locations.items[0].location = 2;
    if (scenario === 'missing item') locations.items = [];
    await expect(takeItemAtLocation('board', 'map', 'hero', 'potion')).resolves.toEqual({ success: false,
      error: scenario === 'enemy' ? 'Cannot take item while there are enemies here' : 'Item potion not found in location' });
    expectNoWrites();
    expect(releaseGame).toHaveBeenCalledTimes(1);
  });
});

describe('hiring NPCs', () => {
  it.each([undefined, 10])('charges available coins (%s), appends the hire, and reserves the NPC', async coins => {
    inventory.coins = coins;
    inventory.hiredNpcIds = ['previous'];
    await expect(hireNpc('board', 'map', 'hero', 'npc')).resolves.toEqual({ success: true, data: {
      equipped: null, equipment: null, coins: (coins ?? 20) - 10, hiredNpcIds: ['previous', 'npc'],
    } });
    expect(locations.npcs[0].masterId).toBe('hero');
    expect(storage.setPlayerInventoryInRedis).toHaveBeenCalledWith('board', 'map', 'hero', inventory);
    expect(storage.setLocationsStateInRedis).toHaveBeenCalledWith('board', 'map', locations);
    expect(publishMessage).toHaveBeenCalledWith('board', 'map', { type: 'location_updated', locationId: 1 });
    expect(releaseLocations).toHaveBeenCalledTimes(1);
    expect(releaseGame).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['missing player', 'NPC is not available at this location'],
    ['missing npc', 'NPC is not available at this location'],
    ['distant npc', 'NPC is not available at this location'],
    ['dead npc', 'Cannot hire a dead NPC'],
    ['hired npc', 'NPC has already been hired'],
    ['no coins', 'Not enough coins to hire this NPC'],
  ])('rejects %s without saving', async (scenario, error) => {
    if (scenario === 'missing player') game.players = [];
    if (scenario === 'missing npc') locations.npcs = [];
    if (scenario === 'distant npc') locations.npcs[0].location.id = 2;
    if (scenario === 'dead npc') locations.npcs[0].health = 0;
    if (scenario === 'hired npc') locations.npcs[0].masterId = 'other';
    if (scenario === 'no coins') inventory.coins = 0;
    await expect(hireNpc('board', 'map', 'hero', 'npc')).resolves.toEqual({ success: false, error });
    expectNoWrites();
    expect(releaseLocations).toHaveBeenCalledTimes(1);
    expect(releaseGame).toHaveBeenCalledTimes(1);
  });
});

describe('store transactions', () => {
  it('sells before buying, rounds sale proceeds up, updates stock, and allocates item IDs', async () => {
    game.players[0].coins = 4;
    game.players[0].equipment = [{ id: 'bow', type: 'bowWarped' }];
    game.players[0].equipped = { weapon: 'bow' };
    await expect(buyAndSellInStore('board', 'map', 'hero', 1, { sellItemIds: ['bow'], buyItemTypes: ['healingPotion'] })).resolves.toEqual({
      success: true, data: { coins: 0, equipment: [{ id: 'i-1', type: 'healingPotion' }], equipped: { weapon: NOTHING_EQUPPED } },
    });
    expect(store.items).toEqual([{ itemId: 'healingPotion', count: 1 }, { itemId: 'bowWarped', count: 1 }]);
    expect(game.counters.itemId).toBe(1);
    expect(storage.setPlayerInventoryInRedis).toHaveBeenCalledWith('board', 'map', 'hero', inventory);
    expect(storage.setStoreStateInRedis).toHaveBeenCalledWith('board', 'map', 1, store);
    expect(storage.setGameStateInRedis).toHaveBeenCalledWith('board', 'map', game);
    expect(releaseStore).toHaveBeenCalledTimes(1);
    expect(releaseGame).toHaveBeenCalledTimes(1);
  });

  it('restocks existing item types and uses pending coins', async () => {
    inventory.coins = 0;
    store.items.push({ itemId: 'swordRusty', count: 2 });
    await buyAndSellInStore('board', 'map', 'hero', 1, { sellItemIds: ['sword'], buyItemTypes: [] });
    expect(inventory.coins).toBe(7);
    expect(store.items.find(item => item.itemId === 'swordRusty')!.count).toBe(3);
  });

  it.each([
    ['elsewhere', 'Cannot buy or sell items at another location'],
    ['no store', 'Store is not available at this location'],
    ['empty stock', 'Item healingPotion is out of stock'],
    ['missing stock', 'Item healingPotion is out of stock'],
    ['no coins', 'Not enough coins to buy item healingPotion'],
  ])('rejects transactions with %s', async (scenario, error) => {
    if (scenario === 'elsewhere') game.players[0].location.id = 2;
    if (scenario === 'no store') game.stores = [];
    if (scenario === 'empty stock') store.items[0].count = 0;
    if (scenario === 'missing stock') store.items = [];
    if (scenario === 'no coins') inventory.coins = 0;
    await expect(buyAndSellInStore('board', 'map', 'hero', 1, { sellItemIds: [], buyItemTypes: ['healingPotion'] })).resolves.toEqual({ success: false, error });
    expectNoWrites();
    expect(releaseStore).toHaveBeenCalledTimes(1);
    expect(releaseGame).toHaveBeenCalledTimes(1);
  });
});

const mutations = [
  ['equip', () => playerEquipItem('board', 'map', 'hero', 'sword'), null],
  ['drop', () => dropItemAtLocation('board', 'map', 'hero', 'sword'), releaseLocations],
  ['take', () => takeItemAtLocation('board', 'map', 'hero', 'potion'), null],
  ['hire', () => hireNpc('board', 'map', 'hero', 'npc'), releaseLocations],
  ['trade', () => buyAndSellInStore('board', 'map', 'hero', 1, { sellItemIds: [], buyItemTypes: [] }), releaseStore],
] as const;

it.each(mutations)('%s releases all acquired locks after a read failure', async (_name, action, secondaryRelease) => {
  storage.getPlayerInventoryFromRedis.mockRejectedValue(new Error('Read failed'));
  await expect(action()).resolves.toEqual({ success: false, error: 'Read failed' });
  expectNoWrites();
  expect(releaseGame).toHaveBeenCalledTimes(1);
  if (secondaryRelease) expect(secondaryRelease).toHaveBeenCalledTimes(1);
});

it.each(mutations)('%s releases locks and stops subsequent writes after inventory persistence fails', async (_name, action, secondaryRelease) => {
  storage.setPlayerInventoryInRedis.mockRejectedValue(new Error('Write failed'));
  await expect(action()).resolves.toEqual({ success: false, error: 'Write failed' });
  expect(storage.setLocationsStateInRedis).not.toHaveBeenCalled();
  expect(storage.setStoreStateInRedis).not.toHaveBeenCalled();
  expect(storage.setGameStateInRedis).not.toHaveBeenCalled();
  expect(publishMessage).not.toHaveBeenCalled();
  expect(releaseGame).toHaveBeenCalledTimes(1);
  if (secondaryRelease) expect(secondaryRelease).toHaveBeenCalledTimes(1);
});

it.each(mutations)('%s stops when the game lock is unavailable', async (_name, action) => {
  storage.lockGameStateInRedis.mockRejectedValue(new Error('Locked'));
  await expect(action()).resolves.toEqual({ success: false, error: 'Locked' });
  expect(storage.getPlayerInventoryFromRedis).not.toHaveBeenCalled();
  expect(releaseGame).not.toHaveBeenCalled();
  expectNoWrites();
});

it.each([
  [storage.lockLocationsStateInRedis, () => hireNpc('board', 'map', 'hero', 'npc')],
  [storage.lockStoreStateInRedis, () => buyAndSellInStore('board', 'map', 'hero', 1, { buyItemTypes: [], sellItemIds: [] })],
] as const)('releases the game lock if a second lock cannot be acquired', async (lock, action) => {
  lock.mockRejectedValue(new Error('Locked'));
  await expect(action()).resolves.toEqual({ success: false, error: 'Locked' });
  expect(releaseGame).toHaveBeenCalledTimes(1);
  expect(releaseLocations).not.toHaveBeenCalled();
  expect(releaseStore).not.toHaveBeenCalled();
  expectNoWrites();
});

it.each([
  [() => dropItemAtLocation('board', 'map', 'hero', 'sword'), 'Cannot drop item while dead'],
  [() => takeItemAtLocation('board', 'map', 'hero', 'potion'), 'Cannot take item while dead'],
  [() => hireNpc('board', 'map', 'hero', 'npc'), 'Cannot hire an NPC while dead'],
  [() => buyAndSellInStore('board', 'map', 'hero', 1, { sellItemIds: [], buyItemTypes: [] }), 'Cannot buy or sell item while dead'],
] as const)('rejects inventory transfers for dead players', async (action, error) => {
  game.players[0].health = 0;
  await expect(action()).resolves.toEqual({ success: false, error });
  expectNoWrites();
  expect(releaseGame).toHaveBeenCalledTimes(1);
});
