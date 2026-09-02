import Image from 'next/image';
import styles from './entity-list.module.css';

export enum EntityItemClass {
  self = 'self',
  friendly = 'friendly',
  enemy = 'enemy',
}

export interface EntityItemDetail {
  id: string;
  name: string;
  icon: string;
  className: EntityItemClass;
  health: number;
  maxHealth: number;
}

export default function PlayerLocationList({
  entities,
  onClickEntity
}: {
  entities: EntityItemDetail[],
  onClickEntity?: (entity: EntityItemDetail) => void
}) {

  const getHealthClass = (iconDetail: EntityItemDetail) => {
    if (iconDetail.health < iconDetail.maxHealth * 0.2) {
      return styles.critical;
    }
    else if (iconDetail.health < iconDetail.maxHealth * 0.5) {
      return styles.hurt;
    }
    return styles.healthy;
  }

  return (
    <ul>
      {entities.map(entity => (
        <li
          key={entity.id}
          className={`${styles.entity} ${styles[entity.className]}`}
          onClick={() => onClickEntity?.(entity)}
        >
          <Image
            src={entity.icon}
            width={53}
            height={80}
            loading="eager"
            alt={entity.name}
          />

          { entity.health > 0 && entity.health < entity.maxHealth &&
            <div
              className={`${styles.healthBar} ${getHealthClass(entity)}`}
              style={{ height: `${100 * entity.health / entity.maxHealth}%` }}
            ></div>
          }

          { entity.health <= 0 &&
            <div className={`${styles.playerDead} material-symbols-outlined`}>skull</div>
          }
        </li>
      ))}
    </ul>
  );
}
