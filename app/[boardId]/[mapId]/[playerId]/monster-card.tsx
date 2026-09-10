import Image from 'next/image';
import { monsters } from '@/lib/games/monsters';

import styles from './monster-card.module.css';
import { MonsterState } from '@/lib/store/types';
import EntityBaseStats from './entity-base-stats';
import { getMonsterStats } from '@/lib/runner/monster-stats';

export default function MonsterCard({
  monster,
  canAttack,
  onAttack
}: {
  monster: MonsterState,
  canAttack: boolean,
  onAttack: () => void,
}) {
  const monsterStats = getMonsterStats(monster);

  return <>
    <span className={styles.monsterIcon}
      style={{
        backgroundPosition: `-${monsters[monster.type].iconXY.x * 100}px -${monsters[monster.type].iconXY.y * 160}px`,
      }}
    />
    <div className={`card ${styles.statsCard}`}>
      <EntityBaseStats current={{health: monster.health}} baseStats={monsterStats} />
    </div>
    <div>
      { canAttack && monster.health > 0 && (
        <button className="btn" onClick={onAttack}>
          Attack
        </button>
      ) }
    </div>
  </>;
};
