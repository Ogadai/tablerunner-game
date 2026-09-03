import { useState, useEffect } from "react";
import Image from 'next/image';
import { characters } from '@/lib/games/characters';
import { CharacterStats } from '@/lib/games/types';

import styles from './character-card.module.css';
import statsStyles from './entity-base-stats.module.css';

import { PlayerState, PlayerAddStatsState } from '@/lib/store/types';
import EntityBaseStats from './entity-base-stats';

import { getPlayerAddStatsState, setPlayerAddStatsState } from '@/lib/store/playerStatsState';

const emptyStats: CharacterStats = {
  strength: 0,
  skill: 0,
  reactions: 0,
  intelligence: 0,
  resiliance: 0,
};

export default function CharacterCard({
  boardId,
  mapId,
  player,
}: {
  boardId: string;
  mapId: string;
  player: PlayerState;
}) {
  const [playerAddStats, setPlayerAddStats] = useState<PlayerAddStatsState>({ characterStats: emptyStats });

  useEffect(() => {
    const fetchPlayerAddStats = async () => {
      const response = await getPlayerAddStatsState(boardId, mapId, player.id);
      if (response.success) {
        setPlayerAddStats(response.data || { characterStats: emptyStats });
      }
    }

    fetchPlayerAddStats();
  });

  const savePlayerAddStats = async () =>
    await setPlayerAddStatsState(boardId, mapId, player.id, playerAddStats);

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
        Assign points: <span className={ styles.availablePoints }>{ player.availableStats }</span>
      </div> }
    </div>

    <div className={`card ${styles.statsCard}`}>
      <table className={statsStyles.statsTable}><tbody>
        <tr><th>Strength</th><td>{player.characterStats.strength}</td></tr>
        <tr><th>Skill</th><td>{player.characterStats.skill}</td></tr>
        <tr><th>Intelligence</th><td>{player.characterStats.intelligence}</td></tr>
        <tr><th>Resilience</th><td>{player.characterStats.resiliance}</td></tr>
        <tr><th>Reactions</th><td>{player.characterStats.reactions}</td></tr>
      </tbody></table>
    </div>

    <div className={`card ${styles.statsCard}`}>
      <EntityBaseStats health={player.health} baseStats={player.baseStats!} />
    </div>
  </>;
};
