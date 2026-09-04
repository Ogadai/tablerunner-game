import { useState, useEffect, useCallback } from "react";
import Image from 'next/image';
import { characters } from '@/lib/games/characters';
import { CharacterStats as CharacterStatsType, BaseStats } from '@/lib/games/types';

import styles from './character-card.module.css';
import statsStyles from './entity-base-stats.module.css';

import { PlayerState, PlayerAddStatsState } from '@/lib/store/types';
import { getPlayerStats } from '@/lib/store/playerStats';
import EntityBaseStats from './entity-base-stats';

import { getPlayerAddStatsState, setPlayerAddStatsState } from '@/lib/store/playerStatsState';

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
  isSelf,
}: {
  boardId: string;
  mapId: string;
  player: PlayerState;
  isSelf: boolean;
}) {
  const [playerAddStats, setPlayerAddStats] = useState<PlayerAddStatsState>({ characterStats: emptyStats });
  const [baseStats, setBaseStats] = useState<BaseStats>(player.baseStats!);

  const refreshBaseStats = useCallback((characterStats: CharacterStatsType) => {
    const newBaseStats = getPlayerStats({
      ...player,
      characterStats: {
        strength: player.characterStats.strength + characterStats.strength,
        skill: player.characterStats.skill + characterStats.skill,
        intelligence: player.characterStats.intelligence + characterStats.intelligence,
        resiliance: player.characterStats.resiliance + characterStats.resiliance,
        reactions: player.characterStats.reactions + characterStats.reactions,
      }
    });

    setBaseStats(newBaseStats);
  }, [player]);

  useEffect(() => {
    const fetchPlayerAddStats = async () => {
      const response = await getPlayerAddStatsState(boardId, mapId, player.id);
      if (response.success) {
        const stats: PlayerAddStatsState = (response.data && response.data.characterStats)
          ? response.data : { characterStats: emptyStats };

        setPlayerAddStats(stats);
        refreshBaseStats(stats.characterStats!);
      }
    }

    if (isSelf) {
      fetchPlayerAddStats();
    } else {
      setPlayerAddStats({ characterStats: emptyStats });
    }
  }, [boardId, mapId, player.id, isSelf]);

  const savePlayerAddStats = async (nextStats: PlayerAddStatsState = playerAddStats) =>
    await setPlayerAddStatsState(boardId, mapId, player.id, nextStats);

  const allocatedPoints = Object.values(playerAddStats.characterStats || emptyStats)
    .reduce((total, points) => total + points, 0);
  const availablePoints = Math.max(0, player.availableStats - allocatedPoints);

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

    setPlayerAddStats(nextStats);
    refreshBaseStats(nextStats.characterStats);

    await savePlayerAddStats(nextStats);
  };

  return <>
    <div className={styles.characterHeader}>
      <Image
        className={styles.characterImage}
        src={characters[player.id].icon}
        width={53}
        height={80}
        loading="eager"
        alt={player.name}
      />
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
      <EntityBaseStats health={player.health} baseStats={baseStats} />
    </div>
  </>;
};