import { allItems, SpecialIds } from '@/lib/games/items';
import styles from './inventory-item.module.css';
import { PlayerItem } from '@/lib/games/types';
import { LockClosedIcon } from '@radix-ui/react-icons';

export default function LocationItemList({ items, onTakeItem }: {
  items: PlayerItem[];
  onTakeItem: (id: string) => void;
}) {
  
  const renderItem = (item: PlayerItem) => {
    const itemDef = allItems[item.type];
    const isLockedChest = item.type === SpecialIds.chest && Boolean(item.key);

    return (<button
      key={item.id}
      type="button"
      className={styles.inventoryItem}
      aria-label={itemDef.name}
      title={isLockedChest ? `${itemDef.name} (Locked)` : itemDef.name}
      onClick={() => onTakeItem(item.id)}
    >
      <span className={styles.itemIcon}
        style={itemDef.iconXY ? {
          backgroundPosition: `-${itemDef.iconXY.x * 60}px -${itemDef.iconXY.y * 60}px`,
          transform: itemDef.iconScale ? `scale(${itemDef.iconScale})` : undefined,
        } : undefined}
      />
      {isLockedChest && (
        <span className={styles.lockBadge} aria-label="Locked" data-testid="lock-icon">
          <LockClosedIcon />
        </span>
      )}
    </button>);
  }

  return (
    <div className={styles.inventoryGrid}>
      {items.map(renderItem)}
    </div>
  );
}
