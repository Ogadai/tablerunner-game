import { CharacterStats as CharacterStatsType } from '@/lib/games/types';

import styles from './character-stats.module.css';
import statsStyles from './entity-base-stats.module.css';

import { GameState, PlayerState, PlayerAddStatsState, PlayerInventoryState } from '@/lib/store/types';
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
  const { sourcePlayer, addStatsState } = usePlayerStatsSnapshot();
  const playerAddStats = isSelf && sourcePlayer?.id === player.id ? addStatsState ?? emptyAddStats : emptyAddStats;

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
        : <CoinDisplay coins={player.coins} />}
      { player.availableStats > 0 && <div className={ styles.availablePointsPrompt }>
        Assign points: <span className={ styles.availablePoints }>{ availablePoints }</span>
      </div> }
    </div>

    <div className={`card ${styles.statsCard}`}>
      <table className={statsStyles.statsTable}><tbody>
        {([
          ['Strength', 'strength', [styles.swordIcon, styles.shieldIcon]],
          ['Skill', 'skill', [styles.bowIcon, styles.shieldIcon]],
          ['Intelligence', 'intelligence', [styles.magicIcon]],
          ['Resilience', 'resiliance', [styles.healthIcon]],
          ['Reactions', 'reactions', [styles.speedIcon, styles.shieldIcon]],
        ] as [string, keyof CharacterStatsType, string[]][]).map(([label, stat, icons]) => {
          const extraPoints = playerAddStats.characterStats?.[stat] || 0;

          return <tr key={stat}>
            <th>{label}</th>
            <td className={ styles.statIconColumn }>{ icons.map(icon =>
              <span key={icon} className={`${styles.statIcon} ${icon}`}></span>
            )}</td>
            <td className={styles.statActions}>
              { isSelf && <button
                type="button"
                className={styles.statButton}
                style={{ visibility: extraPoints > 0 ? 'visible' : 'hidden' }}
                onClick={() => updateStat(stat, -1)}
                aria-label={`Decrease ${label}`}
              >-</button> }
            </td>
            <td className={styles.characterStat}>{player.characterStats[stat] + extraPoints}</td>
            <td className={styles.statActions}>
              { isSelf && <button
                type="button"
                className={styles.statButton}
                style={{ visibility: availablePoints > 0 ? 'visible' : 'hidden' }}
                onClick={() => updateStat(stat, 1)}
                aria-label={`Increase ${label}`}
              >+</button> }
            </td>
          </tr>;
        })}
      </tbody></table>
    </div>

    <div className={`card ${styles.statsCard}`}>
      <EntityBaseStats current={{health: player.health, magic: player.magic}} baseStats={baseStats} />
    </div>
  </>;
};
