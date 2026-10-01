import styles from './entity-list.module.css';

export enum EntityItemClass {
  self = 'self',
  friendly = 'friendly',
  npc = 'npc',
  enemy = 'enemy',
}

export interface EntityItemDetail {
  id: string;
  name: string;
  iconXY: { x: number, y: number },
  className: EntityItemClass;
  health: number;
  maxHealth: number;
  levelUp?: boolean;
}

export default function EntityList({
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
    <ul className={styles.entityList}>
      {entities.map((entity, i) => (
        <li
          key={entity.id}
          aria-label={entity.name}
          title={entity.name}
          tabIndex={onClickEntity ? 0 : undefined}
          className={`${styles.entityListItem} ${i === entities.length - 1 ? styles.main : ''}`}
            style={{ zIndex: entities.length - i }}
          onClick={() => onClickEntity?.(entity)}
          onKeyDown={event => {
            if (onClickEntity && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault();
              onClickEntity(entity);
            }
          }}
        >
          <div
            className={`${styles.entity} ${styles[entity.className]} ${entity.levelUp ? styles.levelUp : ''}`}
          >
            <span className={styles.entityIcon}
              style={{
                backgroundPosition: `-${entity.iconXY.x * 50}px -${entity.iconXY.y * 80}px`,
              }}
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
          </div>
        </li>
      ))}
    </ul>
  );
}
