import styles from './entity-list.module.css';
import CoinDisplay from './coin-display';
import { CombatActionIcon, EntityItemClass, type EntityItemDetail } from '@/lib/store/types';

export { EntityItemClass, type EntityItemDetail };

export interface EntityTargetOverlay {
  icon: CombatActionIcon;
  text?: string;
  isDamage?: boolean;
  miss?: boolean;
}

export default function EntityList({
  entities,
  onClickEntity,
  clickDisabled = false,
  showDeleteIcon = false,
  activeEntityId,
  targetOverlays,
}: {
  entities: EntityItemDetail[],
  onClickEntity?: (entity: EntityItemDetail) => void,
  clickDisabled?: boolean,
  showDeleteIcon?: boolean,
  activeEntityId?: string,
  targetOverlays?: Record<string, EntityTargetOverlay>,
}) {
  const getHealthClass = (iconDetail: EntityItemDetail) => {
    if (iconDetail.health < iconDetail.maxHealth * 0.2) {
      return styles.critical;
    }
    else if (iconDetail.health < iconDetail.maxHealth * 0.5) {
      return styles.hurt;
    }
    return styles.healthy;
  };

  return (
    <ul className={styles.entityList}>
      {entities.map((entity, i) => {
        const isActive = activeEntityId === entity.id;
        const overlay = targetOverlays?.[entity.id];
        const isTarget = !!overlay;

        return (
          <li
            key={entity.id}
            data-entity-id={entity.id}
            aria-label={entity.name}
            title={entity.name}
            tabIndex={onClickEntity ? 0 : undefined}
            className={`${styles.entityListItem} ${i === entities.length - 1 ? styles.main : ''} ${isActive ? styles.activeInitiator : ''} ${isTarget ? styles.targetEntity : ''}`}
            style={{ zIndex: isActive ? 100 : isTarget ? 90 : (entities.length - i) }}
            onClick={() => !clickDisabled && onClickEntity?.(entity)}
            onKeyDown={event => {
              if (event.target === event.currentTarget && onClickEntity && (event.key === 'Enter' || event.key === ' ')) {
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
                  style={{ height: `${Math.max(0, Math.min(100, 100 * entity.health / entity.maxHealth))}%` }}
                ></div>
              }

              { entity.health <= 0 &&
                <div className={`${styles.playerDead} material-symbols-outlined`}>skull</div>
              }

              { overlay && (
                <div className={styles.targetOverlay}>
                  <div
                    className={overlay.icon.sheet === 'spell' ? styles.actionIconSpell : styles.actionIconItem}
                    style={{
                      backgroundPosition: `-${overlay.icon.iconXY.x * 40}px -${overlay.icon.iconXY.y * 40}px`,
                    }}
                  />
                  { overlay.text && (
                    <span className={`${styles.deltaText} ${overlay.miss ? styles.missText : overlay.isDamage ? styles.damageText : styles.healText}`}>
                      {overlay.text}
                    </span>
                  )}
                </div>
              )}

              { entity.cost !== undefined &&
                <div className={`${styles.cost} ${entity.costUnaffordable ? styles.costUnaffordable : ''}`}>
                  <CoinDisplay coins={entity.cost} />
                </div>
              }

              { showDeleteIcon &&
                <div className={`${styles.deleteIcon} material-symbols-outlined`}>delete_forever</div>
              }
            </div>
          </li>
        );
      })}
    </ul>
  );
}
