/** @jest-environment node */
import { applyPlayerAddedStats, levelUpPlayer } from './level-up';
import { createParams } from './test-support/fixtures';

it.each([[24, 1, 5], [25, 2, 7], [99, 2, 7], [100, 3, 9]])(
  'awards levels and unspent stats at %i points', async (points, level, availableStats) => {
    const params = createParams();
    const player = params.gameState.players[0];
    player.points = points;
    await levelUpPlayer(params, player);
    expect(player).toMatchObject({ level, availableStats });
    await levelUpPlayer(params, player);
    expect(player.availableStats).toBe(availableStats);
    expect(params.messages.hero.messages).toHaveLength(level > 1 ? 1 : 0);
  },
);

it('never lowers an existing level or takes away stat points', async () => {
  const params = createParams();
  const player = params.gameState.players[0];
  player.level = 5;
  await levelUpPlayer(params, player);
  expect(player).toMatchObject({ level: 5, availableStats: 5 });
});

it('caps allocated stats by the remaining budget and recalculates base stats', async () => {
  const params = createParams();
  const player = params.gameState.players[0];
  player.equipped = {};
  await applyPlayerAddedStats(params, player, { characterStats: {
    strength: 3, skill: 4, reactions: -2, resiliance: 0, intelligence: 2,
  } });
  expect(player.characterStats).toEqual({ strength: 9, skill: 14, reactions: 10, resiliance: 20, intelligence: 10 });
  expect(player.availableStats).toBe(0);
  expect(player.baseStats).toMatchObject({ attack: 9, damage: 9, defence: 11 });
});

it('refreshes equipment bonuses even without allocated stats', async () => {
  const params = createParams();
  const player = params.gameState.players[0];
  player.equipped = {};
  player.characterStats.intelligence = 17;
  await applyPlayerAddedStats(params, player, { characterStats: null });
  expect(player.baseStats?.magic).toBe(17);
  expect(player.availableStats).toBe(5);
});
