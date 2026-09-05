import styles from './inventory.module.css';
import { PlayerItem } from '@/lib/games/types';

export default function LocationItemList({ items, onTakeItem }: {
  items: PlayerItem[];
  onTakeItem: (id: string, uniqueId?: string) => void;
}) {
  return (
    <div className={styles.inventoryGrid}>
      {items.map((item, i) => {
        return (<button
            key={item.uniqueId}
            type="button"
            className={styles.inventoryItem}
            aria-label={item.name}
            title={item.name}
            onClick={() => onTakeItem(item.id, item.uniqueId)}
          >
            <span className={styles.itemIcon}
              style={item.iconXY ? {
                backgroundPosition: `-${item.iconXY.x * 60}px -${item.iconXY.y * 60}px`,
                transform: item.iconScale ? `scale(${item.iconScale})` : undefined,
              } : undefined}
            />
          </button>);
      })}
    </div>
  );
}
