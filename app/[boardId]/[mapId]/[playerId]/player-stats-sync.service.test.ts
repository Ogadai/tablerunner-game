import { PlayerActionType } from '@/lib/store/types';
import { makePlayer } from './test-fixtures';

jest.mock('@/lib/store/playerInventory', () => ({ getPlayerInventory: jest.fn() }));
jest.mock('@/lib/store/playerActionsState', () => ({ getPlayerActionsState: jest.fn() }));
jest.mock('@/lib/store/playerStatsState', () => ({ getPlayerAddStatsState: jest.fn() }));

describe('PlayerStatsSyncService', () => {
  let service: typeof import('./player-stats-sync.service').default;
  let inventory: jest.MockedFunction<typeof import('@/lib/store/playerInventory').getPlayerInventory>;
  let actions: jest.MockedFunction<typeof import('@/lib/store/playerActionsState').getPlayerActionsState>;
  let additions: jest.MockedFunction<typeof import('@/lib/store/playerStatsState').getPlayerAddStatsState>;
  const added = { strength: 2, skill: 0, reactions: 0, resiliance: 0, intelligence: 1 };

  beforeEach(async () => {
    jest.resetModules();
    service = (await import('./player-stats-sync.service')).default;
    inventory = jest.mocked((await import('@/lib/store/playerInventory')).getPlayerInventory);
    actions = jest.mocked((await import('@/lib/store/playerActionsState')).getPlayerActionsState);
    additions = jest.mocked((await import('@/lib/store/playerStatsState')).getPlayerAddStatsState);
    inventory.mockResolvedValue({ success: true, data: { equipment: [], equipped: {} } });
    actions.mockResolvedValue({ success: true, data: { actions: [] } });
    additions.mockResolvedValue({ success: true, data: { characterStats: null } });
  });

  it('starts with empty stats and supports unsubscribing before initial delivery', async () => {
    const listener = jest.fn();
    service.subscribe(listener)();
    expect(await service.getStats()).toMatchObject({ health: 0, playerCanMove: false });
    expect(await service.getActionsState()).toEqual({ actions: [] });
    expect(await service.getAddStateState()).toBeNull();
    expect(listener).not.toHaveBeenCalled();
    expect(inventory).not.toHaveBeenCalled();
  });

  it('merges inventory and allocated stats without mutating the persisted player', async () => {
    const player = makePlayer({ availableStats: 5, coins: 50 });
    const original = JSON.parse(JSON.stringify(player));
    inventory.mockResolvedValue({ success: true, data: {
      equipment: [{ id: 'sword', type: 'swordRusty' }], equipped: { weapon: 'sword' }, coins: 0,
    } });
    additions.mockResolvedValue({ success: true, data: { characterStats: added } });
    service.updatePlayer('board', 'map', player);
    const stats = await service.getStats();
    expect(inventory).toHaveBeenCalledWith('board', 'map', player.id);
    expect(actions).toHaveBeenCalledWith('board', 'map', player.id);
    expect(additions).toHaveBeenCalledWith('board', 'map', player.id);
    expect(stats).toMatchObject({ availablePoints: 2, baseStats: { attack: 4, magic: 2 } });
    const listener = jest.fn();
    const dispose = service.subscribe(listener);
    await service.getStats();
    expect(listener).toHaveBeenLastCalledWith(stats, { actions: [] }, { characterStats: added },
      expect.objectContaining({ coins: 0, characterStats: original.characterStats,
        equipment: [{ id: 'sword', type: 'swordRusty' }] }));
    expect(player).toEqual(original);
    dispose();
  });

  it('recomputes cached actions, magic and movement and stops notifying disposed listeners', async () => {
    service.updatePlayer('board', 'map', makePlayer({ magic: 10 }));
    await service.getStats();
    const listener = jest.fn();
    const dispose = service.subscribe(listener);
    await service.getStats();
    service.updateActionsState({ actions: [{ id: 1, type: PlayerActionType.Attack, description: 'Attack' }] });
    expect(await service.getStats()).toMatchObject({ isAttacking: true, playerCanMove: false, actionPointsUsed: 12 });
    dispose();
    listener.mockClear();
    service.updateActionsState({ actions: [{ id: 2, type: PlayerActionType.Cast, description: 'Cast',
      ...{ spellId: 'spiritArrow' } }] });
    expect(await service.getStats()).toMatchObject({ isAttacking: false, magicUsed: 3, magicLeft: 7, playerCanMove: false });
    expect(listener).not.toHaveBeenCalled();
    expect(inventory).toHaveBeenCalledTimes(1);
    expect(actions).toHaveBeenCalledTimes(1);
    expect(additions).toHaveBeenCalledTimes(1);
  });

  it('updates inventory and allocations locally and resets caches when switching players', async () => {
    service.updatePlayer('board', 'map', makePlayer({ availableStats: 1 }));
    await service.getStats();
    service.updateAddStatsState({ characterStats: added });
    expect(await service.getStats()).toMatchObject({ availablePoints: 0, baseStats: { attack: 3 } });
    service.updateInventory(undefined);
    await service.getStats();
    expect(inventory).toHaveBeenCalledTimes(1);
    service.updatePlayer('board', 'other-map', makePlayer({ id: 'mage', health: 0 }));
    expect(await service.getStats()).toMatchObject({ health: 0, playerCanMove: false, actionPointsTotal: 0 });
    expect(inventory).toHaveBeenLastCalledWith('board', 'other-map', 'mage');
    expect(await service.getAddStateState()).toEqual({ characterStats: null });
  });

  it('falls back to player data when API responses fail', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      inventory.mockResolvedValue({ success: false, error: 'Inventory unavailable' });
      actions.mockResolvedValue({ success: false, error: 'Actions unavailable' });
      additions.mockResolvedValue({ success: false, error: 'Stats unavailable' });
      service.updatePlayer('board', 'map', makePlayer());
      expect(await service.getStats()).toMatchObject({ health: 10, actionPointsUsed: 0, playerCanMove: true });
      expect(await service.getActionsState()).toEqual({ actions: [] });
      expect(error).toHaveBeenCalledWith('Inventory unavailable');
    } finally {
      error.mockRestore();
    }
  });
});
