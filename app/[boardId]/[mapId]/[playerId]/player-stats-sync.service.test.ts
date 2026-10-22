import { PlayerActionType, type PlayerTurnInputs } from '@/lib/store/types';
import { makePlayer } from './test-fixtures';

describe('PlayerStatsSyncService', () => {
  let service: typeof import('./player-stats-sync.service').default;
  let store: typeof import('./player-stats-store').default;
  let inputs: PlayerTurnInputs;

  beforeEach(async () => {
    jest.resetModules();
    service = (await import('./player-stats-sync.service')).default;
    store = (await import('./player-stats-store')).default;
    inputs = {
      inventory: { equipment: null, equipped: null },
      actions: { actions: [] }, addedStats: { characterStats: null }, instructions: {},
    };
  });

  it('publishes inputs and their calculated values together, synchronously', () => {
    const player = makePlayer({ availableStats: 5 });
    const addedStats = { characterStats: { strength: 2, skill: 0, reactions: 0, resiliance: 0, intelligence: 1 } };
    const listener = jest.fn(() => {
      expect(store.getSnapshot()).toMatchObject({
        sourcePlayer: player, addStatsState: addedStats,
        playerStats: { availablePoints: 2, baseStats: { attack: 3, magic: 2 } },
      });
    });
    store.subscribe(listener);
    service.updatePlayer(player, { ...inputs, addedStats });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('replaces all pending inputs when switching players or turns', () => {
    const oldPlayer = makePlayer({ availableStats: 1 });
    service.updatePlayer(oldPlayer, inputs);
    service.updateInventory({ equipment: [], equipped: {}, coins: 0 });
    service.updateActionsState({ actions: [{ id: 1, type: PlayerActionType.Attack, description: 'Attack' }] });
    service.updateAddStatsState({ characterStats: { strength: 2, skill: 0, reactions: 0, resiliance: 0, intelligence: 0 } });
    const player = makePlayer({ id: 'mage', health: 0 });
    service.updatePlayer(player, inputs);
    expect(store.getSnapshot()).toMatchObject({
      sourcePlayer: player, inventoryState: inputs.inventory, actionsState: inputs.actions,
      addStatsState: inputs.addedStats, activePlayer: { id: 'mage', health: 0 },
      playerStats: { health: 0, playerCanMove: false, actionPointsTotal: 0 },
    });
  });

  it('preserves state for missing responses and accepts an explicitly empty inventory', () => {
    const player = makePlayer();
    service.updatePlayer(player, inputs);
    const previous = store.getSnapshot();
    const listener = jest.fn();
    store.subscribe(listener);
    service.updateInventory(undefined);
    service.updateActionsState(undefined);
    expect(store.getSnapshot()).toBe(previous);
    expect(listener).not.toHaveBeenCalled();
    const inventory = { equipment: [], equipped: {}, coins: 0 };
    service.updateInventory(inventory, player);
    expect(store.getSnapshot().inventoryState).toBe(inventory);
    expect(store.getSnapshot().activePlayer).toMatchObject({ equipment: [], coins: 0 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it.each(['turn', 'player'])('ignores responses from an earlier %s', change => {
    const oldPlayer = makePlayer({ coins: 120 });
    service.updatePlayer(oldPlayer, inputs);
    const currentPlayer = { ...oldPlayer, id: change === 'player' ? 'mage' : oldPlayer.id, coins: 150 };
    service.updatePlayer(currentPlayer, inputs);
    const current = store.getSnapshot();
    const listener = jest.fn();
    store.subscribe(listener);
    service.updateInventory({ equipment: null, equipped: null, coins: 60, teamCoinTransfer: 60 }, oldPlayer);
    service.updateActionsState({ actions: [] }, oldPlayer);
    service.updateAddStatsState({ characterStats: null }, oldPlayer);
    expect(store.getSnapshot()).toBe(current);
    expect(listener).not.toHaveBeenCalled();
    const inventory = { equipment: [], equipped: {}, coins: 90 };
    service.updateInventory(inventory, currentPlayer);
    expect(store.getSnapshot().inventoryState).toBe(inventory);
  });
});
