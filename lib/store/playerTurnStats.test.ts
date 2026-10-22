import { calculatePlayerTurnStats, emptyPlayerStats, type PlayerStatsInputs } from './playerTurnStats';
import { PlayerActionType, type PlayerActionCast } from './types';
import { createPlayer } from './test-support/fixtures';

function makeInputs(overrides: Partial<PlayerStatsInputs> = {}): PlayerStatsInputs {
  return {
    sourcePlayer: createPlayer({
      health: 10, magic: 10, equipment: [], equipped: {},
      characterStats: { strength: 1, skill: 1, intelligence: 1, resiliance: 1, reactions: 1 },
    }),
    inventoryState: null, actionsState: { actions: [] }, addStatsState: null,
    ...overrides,
  };
}

it('returns the empty view when no player is loaded', () => {
  expect(calculatePlayerTurnStats(makeInputs({ sourcePlayer: null })))
    .toEqual({ playerStats: emptyPlayerStats, activePlayer: null });
});

it('combines pending equipment and allocations without mutating or double-counting persisted stats', () => {
  const inputs = makeInputs({
    inventoryState: { equipment: [{ id: 'sword', type: 'swordRusty' }], equipped: { weapon: 'sword' }, coins: 0 },
    addStatsState: { characterStats: { strength: 2, skill: 0, reactions: 0, resiliance: 0, intelligence: 1 } },
  });
  const original = JSON.parse(JSON.stringify(inputs));
  const result = calculatePlayerTurnStats(inputs);
  expect(result.playerStats).toMatchObject({ availablePoints: 2, baseStats: { attack: 4, magic: 2 } });
  expect(result.activePlayer).toMatchObject({ coins: 0, equipment: inputs.inventoryState!.equipment });
  expect(result.activePlayer?.characterStats).toBe(inputs.sourcePlayer!.characterStats);
  expect(result.activePlayer?.baseStats).toBe(result.playerStats.baseStats);
  expect(inputs).toEqual(original);
  expect(calculatePlayerTurnStats(inputs)).toEqual(result);
});

it('accounts for queued attacks, spell costs and movement availability', () => {
  const inputs = makeInputs();
  expect(calculatePlayerTurnStats(inputs).playerStats).toMatchObject({ playerCanMove: true, actionPointsUsed: 0 });
  expect(calculatePlayerTurnStats({ ...inputs, actionsState: {
    actions: [{ id: 1, type: PlayerActionType.Attack, description: 'Attack' }],
  } }).playerStats).toMatchObject({ isAttacking: true, playerCanMove: false, actionPointsUsed: 12 });
  const cast: PlayerActionCast = { id: 2, type: PlayerActionType.Cast, description: 'Cast', spellId: 'spiritArrow' };
  expect(calculatePlayerTurnStats({ ...inputs, actionsState: { actions: [cast] } }).playerStats)
    .toMatchObject({ isAttacking: false, magicUsed: 3, magicLeft: 7, playerCanMove: false });
});

it('uses persisted inventory for null pending values and honors empty equipment and zero coins', () => {
  const player = createPlayer();
  const inputs = makeInputs({ sourcePlayer: player, inventoryState: { equipment: null, equipped: null } });
  expect(calculatePlayerTurnStats(inputs).activePlayer).toMatchObject({ equipment: player.equipment, coins: player.coins });
  expect(calculatePlayerTurnStats({ ...inputs, inventoryState: { equipment: [], equipped: {}, coins: 0 } }).activePlayer)
    .toMatchObject({ equipment: [], coins: 0 });
});

it('prevents dead players from moving and clamps unallocated points to zero', () => {
  const result = calculatePlayerTurnStats(makeInputs({
    sourcePlayer: createPlayer({ health: 0, availableStats: 1 }),
    addStatsState: { characterStats: { strength: 2, skill: 0, reactions: 0, resiliance: 0, intelligence: 0 } },
  }));
  expect(result.playerStats).toMatchObject({ health: 0, playerCanMove: false, actionPointsTotal: 0, availablePoints: 0 });
});
