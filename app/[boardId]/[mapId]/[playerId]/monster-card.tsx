import Image from 'next/image';
import { monsters } from '@/lib/games/monsters';

import styles from './monster-card.module.css';
import { MonsterState } from '@/lib/store/types';
import EntityBaseStats from './entity-base-stats';

export default function MonsterCard({
  monster,
  canAttack,
  onAttack
}: {
  monster: MonsterState,
  canAttack: boolean,
  onAttack: () => void,
}) {
  return <>
    <Image
      className={styles.monsterImage}
      src={monsters[monster.type].image}
      width={256}
      height={384}
      loading="eager"
      alt={monsters[monster.type].name}
    />
    <div className={`card ${styles.statsCard}`}>
      <EntityBaseStats health={monster.health} baseStats={monsters[monster.type].baseStats} />
    </div>
    <div>
      { canAttack && (
        <button className="btn" onClick={onAttack}>
          Attack
        </button>
      ) }
    </div>
  </>;
};
