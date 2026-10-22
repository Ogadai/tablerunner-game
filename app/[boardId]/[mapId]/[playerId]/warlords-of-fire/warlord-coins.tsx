'use client';

import { startTransition, useActionState, useEffect, useOptimistic, useRef, useState } from 'react';
import { GameState, PlayerInventoryState, PlayerState } from '@/lib/store/types';
import { warlordAllocateCoins } from '@/lib/runner/warlords-of-fire/server-actions';
import { getState } from '@/lib/runner/warlords-of-fire/territory-state';
import CoinDisplay from '../coin-display';
import playerStatsSyncService from '../player-stats-sync.service';
import usePlayerStatsSnapshot from '../use-player-stats-snapshot';
import styles from './warlord-coins.module.css';

interface CoinAllocation {
  teamCoins: number;
  context: string;
  requestId: number;
}

interface AllocationSaveState {
  context: string;
  error: string | null;
}

export default function WarlordCoins({
  boardId,
  mapId,
  gameState,
  player,
  isSelf = true,
  inventory,
  processing = false,
  showHint = false,
}: {
  boardId: string;
  mapId: string;
  gameState: GameState;
  player: PlayerState;
  isSelf?: boolean;
  inventory?: PlayerInventoryState;
  processing?: boolean;
  showHint?: boolean;
}) {
  const statsSnapshot = usePlayerStatsSnapshot();
  const [draftAllocation, setDraftAllocation] = useState<CoinAllocation | null>(null);
  const draft = useRef<CoinAllocation | null>(null);
  const requestId = useRef(0);
  const inventoryContext = JSON.stringify([boardId, mapId, player.id, gameState.turn]);
  const currentInventoryContext = useRef(inventoryContext);

  const sourcePlayer = gameState.players.find(source => source.id === player.id);
  const liveInventory = statsSnapshot.sourcePlayer === sourcePlayer ? statsSnapshot.inventoryState : null;
  const pendingInventory = isSelf ? liveInventory : inventory;
  const team = getState(gameState).teams[player.team || player.id];
  const teamCoins = (team?.coins ?? 0) + (pendingInventory?.teamCoinTransfer ?? 0);
  const personalCoins = pendingInventory?.coins ?? player.coins;
  const totalCoins = personalCoins + teamCoins;
  const disabled = processing || player.health <= 0 || !team || totalCoins <= 0;
  const context = JSON.stringify([inventoryContext, player.team, isSelf, disabled]);
  const [optimisticTeamCoins, allocateOptimistically] = useOptimistic(teamCoins, (current, allocation: CoinAllocation) =>
    allocation.context === context ? allocation.teamCoins : current);
  const allocatedTeamCoins = draftAllocation?.context === context ? draftAllocation.teamCoins : optimisticTeamCoins;
  const allocatedPersonalCoins = totalCoins - allocatedTeamCoins;

  useEffect(() => {
    currentInventoryContext.current = inventoryContext;
  }, [inventoryContext]);

  useEffect(() => {
    const requests = requestId;
    return () => { requests.current++; };
  }, [context]);

  const [saveState, saveCoins, saving] = useActionState<AllocationSaveState, CoinAllocation>(async (previous, allocation) => {
    if (allocation.requestId !== requestId.current) return previous;

    try {
      const response = await warlordAllocateCoins(boardId, mapId, player.id, allocation.teamCoins);
      if (response.success && response.data && currentInventoryContext.current === inventoryContext) {
        // Keep confirmed inventory in sync even if this popup has closed.
        const confirmedInventory = response.data;
        startTransition(() => playerStatsSyncService.updateInventory(confirmedInventory, gameState.players.find(source => source.id === player.id)));
      }
      if (allocation.requestId !== requestId.current) return previous;
      return { context: allocation.context, error: response.success && response.data
        ? null : response.error || 'Unable to allocate coins.' };
    } catch (error) {
      if (allocation.requestId !== requestId.current) return previous;
      return { context: allocation.context, error: error instanceof Error ? error.message : 'Unable to allocate coins.' };
    }
  }, { context, error: null });
  const error = saveState.context === context ? saveState.error : null;

  const cancelDraft = () => {
    draft.current = null;
    setDraftAllocation(null);
  };

  const saveAllocation = () => {
    const allocation = draft.current;
    if (!allocation || allocation.context !== context || disabled || !isSelf) return;
    // A release followed by blur must submit this draft only once.
    cancelDraft();
    if (allocation.teamCoins === optimisticTeamCoins) return;

    startTransition(() => {
      allocateOptimistically(allocation);
      saveCoins(allocation);
    });
  };

  return <section className={styles.allocation} aria-label="Coin allocation">
    <div className={styles.balances}>
      <div className={styles.balance} aria-label={`Personal coins: ${allocatedPersonalCoins}`}>
        <span>Personal</span><CoinDisplay coins={allocatedPersonalCoins} />
      </div>
      <div className={styles.balance} aria-label={`Team coins: ${allocatedTeamCoins}`}>
        <span>Team</span><CoinDisplay coins={allocatedTeamCoins} />
      </div>
    </div>
    {isSelf && <>
      <input
        className={styles.slider}
        type="range"
        min={0}
        max={totalCoins}
        step={1}
        value={allocatedTeamCoins}
        disabled={disabled}
        aria-label="Coins allocated to team"
        aria-valuetext={`${allocatedPersonalCoins} personal coins, ${allocatedTeamCoins} team coins`}
        onChange={event => {
          const allocation = { teamCoins: Number(event.target.value), context, requestId: requestId.current };
          draft.current = allocation;
          setDraftAllocation(allocation);
        }}
        onPointerUp={saveAllocation}
        onKeyUp={saveAllocation}
        onBlur={saveAllocation}
        onPointerCancel={cancelDraft}
      />
      {showHint && <p className={styles.hint}>Team coins fund sub-commanders.</p>}
      {saving && <p className={styles.statusMessage} role="status">Saving...</p>}
      {!saving && error && <p className={styles.statusMessage} role="alert">{error}</p>}
    </>}
  </section>;
}
