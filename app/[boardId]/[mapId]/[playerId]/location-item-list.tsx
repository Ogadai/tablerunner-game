import { allItems } from '@/lib/games/items';
import styles from './inventory.module.css';
import { PlayerItem } from '@/lib/games/types';

export default function LocationItemList({ items, onTakeItem }: {
  items: PlayerItem[];
  onTakeItem: (id: string) => void;
}) {
  
  const renderItem = (item: PlayerItem) => {
    const itemDef = allItems[item.type];

    return (<button
      key={item.id}
      type="button"
      className={styles.inventoryItem}
      aria-label={itemDef.name}
      title={itemDef.name}
      onClick={() => onTakeItem(item.id)}
    >
      <span className={styles.itemIcon}
        style={itemDef.iconXY ? {
          backgroundPosition: `-${itemDef.iconXY.x * 60}px -${itemDef.iconXY.y * 60}px`,
          transform: itemDef.iconScale ? `scale(${itemDef.iconScale})` : undefined,
        } : undefined}
      />
    </button>);
  }

  return (
    <div className={styles.inventoryGrid}>
      {items.map(renderItem)}
    </div>
  );
}
