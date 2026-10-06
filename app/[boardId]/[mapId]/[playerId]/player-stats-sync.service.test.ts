import { PlayerActionType, type PlayerTurnInputs } from '@/lib/store/types';
import { makePlayer } from './test-fixtures';

describe('PlayerStatsSyncService', () => {
  let service: typeof import('./player-stats-sync.service').default;
  let inputs: PlayerTurnInputs;
  const added = { strength: 2, skill: 0, reactions: 0, resiliance: 0, intelligence: 1 };

  beforeEach(async () => {
    jest.resetModules();
    service = (await import('./player-stats-sync.service')).default;
    inputs = {
      inventory: { equipment: null, equipped: null },
      actions: { actions: [] }, addedStats: { characterStats: null },
      instructions: {},
    };
  });

  it('starts with empty stats and supports unsubscribing before initial delivery', async () => {
    const listener = jest.fn();
    service.subscribe(listener)();
    expect(await service.getStats()).toMatchObject({ health: 0, playerCanMove: false });
    expect(await service.getActionsState()).toEqual({ actions: [] });
    expect(await service.getAddStateState()).toBeNull();
    expect(listener).not.toHaveBeenCalled();
  });

  it('merges inventory and allocated stats without mutating the persisted player', async () => {
    const player = makePlayer({ availableStats: 5, coins: 50 });
    const original = JSON.parse(JSON.stringify(player));
    inputs.inventory = {
      equipment: [{ id: 'sword', type: 'swordRusty' }], equipped: { weapon: 'sword' }, coins: 0,
    };
    inputs.addedStats = { characterStats: added };
    service.updatePlayer(player, inputs);
    const stats = await service.getStats();
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
    service.updatePlayer(makePlayer({ magic: 10 }), inputs);
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
  });

  it('updates inventory and allocations locally and resets caches when switching players', async () => {
    service.updatePlayer(makePlayer({ availableStats: 1 }), inputs);
    await service.getStats();
    service.updateAddStatsState({ characterStats: added });
    expect(await service.getStats()).toMatchObject({ availablePoints: 0, baseStats: { attack: 3 } });
    service.updateInventory(undefined);
    await service.getStats();
    service.updatePlayer(makePlayer({ id: 'mage', health: 0 }), inputs);
    expect(await service.getStats()).toMatchObject({ health: 0, playerCanMove: false, actionPointsTotal: 0 });
    expect(await service.getAddStateState()).toEqual({ characterStats: null });
  });

  it('uses persisted inventory when the snapshot has no pending inventory changes', async () => {
    const player = makePlayer({ equipment: [{ id: 'sword', type: 'swordRusty' }], equipped: { weapon: 'sword' } });
    service.updatePlayer(player, inputs);
    expect(await service.getStats()).toMatchObject({ health: 10, actionPointsUsed: 0, playerCanMove: true });
    const listener = jest.fn();
    service.subscribe(listener);
    await service.getStats();
    expect(listener).toHaveBeenLastCalledWith(expect.anything(), { actions: [] }, { characterStats: null },
      expect.objectContaining({ equipment: player.equipment, equipped: player.equipped }));
  });

  it('preserves pending inventory when an action returns no data and accepts an explicitly empty inventory', async () => {
    const inventory = {
      equipment: [{ id: 'sword', type: 'swordRusty' }],
      equipped: { weapon: 'sword' },
      coins: 5,
    };
    service.updatePlayer(makePlayer(), { ...inputs, inventory });
    await service.getStats();
    const listener = jest.fn();
    const dispose = service.subscribe(listener);
    await service.getStats();
    const stats = await service.getStats();
    listener.mockClear();

    service.updateInventory(undefined);
    expect(await service.getStats()).toBe(stats);
    expect(listener).not.toHaveBeenCalled();
    service.updateActionsState({ actions: [] });
    await service.getStats();
    expect(listener).toHaveBeenLastCalledWith(expect.anything(), { actions: [] }, inputs.addedStats,
      expect.objectContaining(inventory));

    service.updateInventory({ equipment: [], equipped: {}, coins: 0 });
    await service.getStats();
    expect(listener).toHaveBeenLastCalledWith(expect.anything(), { actions: [] }, inputs.addedStats,
      expect.objectContaining({ equipment: [], coins: 0 }));
    dispose();
  });
});
