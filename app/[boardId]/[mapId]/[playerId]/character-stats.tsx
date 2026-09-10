import { useState, useEffect } from "react";
import { CharacterStats as CharacterStatsType } from '@/lib/games/types';

import styles from './character-stats.module.css';
import statsStyles from './entity-base-stats.module.css';

import { PlayerState, PlayerAddStatsState } from '@/lib/store/types';
import EntityBaseStats from './entity-base-stats';

import { setPlayerAddStatsState } from '@/lib/store/playerStatsState';
import CoinDisplay from './coin-display';
import playerStatsSyncService, { PlayerStats } from "./player-stats-sync.service";

const emptyStats: CharacterStatsType = {
  strength: 0,
  skill: 0,
  reactions: 0,
  intelligence: 0,
  resiliance: 0,
};

export default function CharacterStats({
  boardId,
  mapId,
  player,
  playerStats,
  isSelf,
}: {
  boardId: string;
  mapId: string;
  player: PlayerState;
  playerStats: PlayerStats | null;
  isSelf: boolean;
}) {
  const [playerAddStats, setPlayerAddStats] = useState<PlayerAddStatsState>({ characterStats: emptyStats });

  const baseStats = playerStats?.baseStats! || player.baseStats!;

  useEffect(() => {
    const disposeFns = [
      playerStatsSyncService.subscribe((stats, actionsState, addStatsState) => {
        setPlayerAddStats(addStatsState || { characterStats: emptyStats });
      }),
    ];

    playerStatsSyncService.getAddStateState().then(addStatsState => 
      setPlayerAddStats(addStatsState || { characterStats: emptyStats })
    );

    return () => disposeFns.forEach(f => f());
  }, [player]);

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

    playerStatsSyncService.updateAddStatsState(nextStats);
    await savePlayerAddStats(nextStats);
  };

  return <>
    <div className={styles.characterHeader}>
      <CoinDisplay coins={player.coins} />
      { player.availableStats > 0 && <div className={ styles.availablePointsPrompt }>
        Assign points: <span className={ styles.availablePoints }>{ availablePoints }</span>
      </div> }
    </div>

    <div className={`card ${styles.statsCard}`}>
      <table className={statsStyles.statsTable}><tbody>
        {([
          ['Strength', 'strength'],
          ['Skill', 'skill'],
          ['Intelligence', 'intelligence'],
          ['Resilience', 'resiliance'],
          ['Reactions', 'reactions'],
        ] as [string, keyof CharacterStatsType][]).map(([label, stat]) => {
          const extraPoints = playerAddStats.characterStats?.[stat] || 0;

          return <tr key={stat}>
            <th>{label}</th>
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