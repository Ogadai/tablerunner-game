'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { GameState, PlayerInventoryState, PlayerState } from '@/lib/store/types';
import { warlordAllocateCoins } from '@/lib/runner/warlords-of-fire/server-actions';
import { getState } from '@/lib/runner/warlords-of-fire/territory-state';
import CoinDisplay from '../coin-display';
import playerStatsSyncService from '../player-stats-sync.service';
import styles from './warlord-coins.module.css';

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
  const [liveInventory, setLiveInventory] = useState<PlayerInventoryState | null>(null);
  const [draftTeamCoins, setDraftTeamCoins] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const savePending = useRef(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (!isSelf) return;
    return playerStatsSyncService.subscribe((_stats, _actions, _addedStats, activePlayer, inventory) => {
      if (activePlayer?.id === player.id) setLiveInventory(inventory ?? null);
    });
  }, [isSelf, player.id]);

  useEffect(() => {
    const requests = requestId;
    return () => { requests.current++; };
  }, [boardId, mapId, player.id, gameState.turn]);

  const pendingInventory = isSelf ? liveInventory : inventory;
  const team = getState(gameState).teams[player.team || player.id];
  const teamCoins = (team?.coins ?? 0) + (pendingInventory?.teamCoinTransfer ?? 0);
  const personalCoins = pendingInventory?.coins ?? player.coins;
  const totalCoins = personalCoins + teamCoins;
  const allocatedTeamCoins = draftTeamCoins ?? teamCoins;
  const allocatedPersonalCoins = totalCoins - allocatedTeamCoins;
  const disabled = processing || saving || player.health <= 0 || !team || totalCoins <= 0;

  const saveAllocation = () => {
    if (draftTeamCoins === null || savePending.current || disabled || !isSelf) return;
    if (draftTeamCoins === teamCoins) {
      setDraftTeamCoins(null);
      return;
    }
    savePending.current = true;
    const currentRequest = ++requestId.current;
    setError(null);
    startSaving(async () => {
      try {
        const response = await warlordAllocateCoins(boardId, mapId, player.id, draftTeamCoins);
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Unable to allocate coins.');
        }
        playerStatsSyncService.updateInventory(response.data, gameState.players.find(source => source.id === player.id));
      } catch (error) {
        if (currentRequest === requestId.current) setError((error as Error).message);
      } finally {
        savePending.current = false;
        if (currentRequest === requestId.current) setDraftTeamCoins(null);
      }
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
        onChange={event => setDraftTeamCoins(Number(event.target.value))}
        onPointerUp={saveAllocation}
        onKeyUp={saveAllocation}
        onBlur={saveAllocation}
        onPointerCancel={() => setDraftTeamCoins(null)}
      />
      {showHint && <p className={styles.hint}>Team coins fund sub-commanders.</p>}
      {saving && <p className={styles.statusMessage} role="status">Saving...</p>}
      {error && <p className={styles.statusMessage} role="alert">{error}</p>}
    </>}
  </section>;
}
