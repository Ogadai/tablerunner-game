import Image from 'next/image';
import { characters } from '@/lib/games/characters';

import styles from './character-card.module.css';
import statsStyles from './entity-base-stats.module.css';

import { PlayerState } from '@/lib/store/types';
import EntityBaseStats from './entity-base-stats';

export default function CharacterCard({
  player,
}: {
  player: PlayerState,
}) {
  return <>
    <div className={styles.characterHeader}>
      <Image
        className={styles.characterImage}
        src={characters[player.id].icon}
        width={256}
        height={384}
        loading="eager"
        alt={player.name}
      />
    </div>

    <div className={`card ${styles.statsCard}`}>
      <table className={statsStyles.statsTable}><tbody>
        <tr><th>Strength</th><td>{player.characterStats.strength}</td></tr>
        <tr><th>Skill</th><td>{player.characterStats.skill}</td></tr>
        <tr><th>Resilience</th><td>{player.characterStats.resiliance}</td></tr>
        <tr><th>Speed</th><td>{player.characterStats.speed}</td></tr>
        <tr><th>Magic</th><td>{player.characterStats.magic}</td></tr>
      </tbody></table>
    </div>

    <div className={`card ${styles.statsCard}`}>
      <EntityBaseStats health={player.health} baseStats={player.baseStats!} />
    </div>
  </>;
};
