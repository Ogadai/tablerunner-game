import { CharacterStats as CharacterStatsType } from '@/lib/games/types';

import styles from './character-stats.module.css';

import { GameState, PlayerState, PlayerAddStatsState, PlayerInventoryState } from '@/lib/store/types';
import CharacterAttributeTable from './character-attribute-table';
import EntityBaseStats from './entity-base-stats';

import { setPlayerAddStatsState } from '@/lib/store/playerStatsState';
import CoinDisplay from './coin-display';
import playerStatsSyncService from "./player-stats-sync.service";
import type { PlayerStats } from '@/lib/store/playerTurnStats';
import usePlayerStatsSnapshot from './use-player-stats-snapshot';
import WarlordCoins from './warlords-of-fire/warlord-coins';

const emptyStats: CharacterStatsType = {
  strength: 0,
  skill: 0,
  reactions: 0,
  intelligence: 0,
  resiliance: 0,
};

const emptyAddStats: PlayerAddStatsState = { characterStats: emptyStats };

export default function CharacterStats({
  boardId,
  mapId,
  player,
  playerStats,
  isSelf,
  gameState,
  inventory,
  processing,
}: {
  boardId: string;
  mapId: string;
  player: PlayerState;
  playerStats: PlayerStats | null;
  isSelf: boolean;
  gameState?: GameState;
  inventory?: PlayerInventoryState;
  processing?: boolean;
}) {
  const { sourcePlayer, addStatsState, inventoryState } = usePlayerStatsSnapshot();
  const playerAddStats = isSelf && sourcePlayer?.id === player.id ? addStatsState ?? emptyAddStats : emptyAddStats;
  const liveInventory = isSelf && sourcePlayer?.id === player.id ? inventoryState : null;
  const coins = liveInventory?.coins ?? inventory?.coins ?? player.coins;

  const baseStats = playerStats?.baseStats || player.baseStats!;

  const savePlayerAddStats = async (nextStats: PlayerAddStatsState = playerAddStats) =>
    await setPlayerAddStatsState(boardId, mapId, player.id, nextStats);

  const allocatedPoints = Object.values(playerAddStats.characterStats || emptyStats)
    .reduce((total, points) => total + points, 0);
  const availablePoints = player.health > 0 ? Math.max(0, player.availableStats - allocatedPoints) : 0;

  const updateStat = async (stat: keyof CharacterStatsType, change: number) => {
    const currentValue = playerAddStats.characterStats?.[stat] || 0;
    const nextValue = Math.max(0, currentValue + change);

    if (nextValue === currentValue || (change > 0 && availablePoints <= 0)) {
      return;
    }

    const nextStats = {
      ...playerAddStats,
      characterStats: {
        ...(playerAddStats.characterStats || emptyStats),
        [stat]: nextValue,
      },
    };

    playerStatsSyncService.updateAddStatsState(nextStats, sourcePlayer ?? undefined);
    await savePlayerAddStats(nextStats);
  };

  return <>
    <div className={`${styles.characterHeader} ${(gameState?.gameId === 'warlordsfire') ? styles.warlordsfireHeader : ''}`}>
      {gameState?.gameId === 'warlordsfire'
        ? <WarlordCoins key={`${player.id}:${gameState.turn}`} boardId={boardId} mapId={mapId} gameState={gameState} player={player}
            isSelf={isSelf} inventory={inventory} processing={processing} />
        : <CoinDisplay coins={coins} />}
      { player.availableStats > 0 && <div className={ styles.availablePointsPrompt }>
        Assign points: <span className={ styles.availablePoints }>{ availablePoints }</span>
      </div> }
    </div>

    <div className={`card ${styles.statsCard}`}>
      <CharacterAttributeTable
        characterStats={player.characterStats}
        addedStats={playerAddStats.characterStats ?? undefined}
        editable={isSelf}
        availablePoints={availablePoints}
        onUpdateStat={updateStat}
      />
    </div>

    <div className={`card ${styles.statsCard}`}>
      <EntityBaseStats current={{health: player.health, magic: player.magic}} baseStats={baseStats} />
    </div>
  </>;
};
