import { PlayerState } from '@/lib/store/types';
import styles from './inventory.module.css';
import { PlayerItem } from '@/lib/games/types';

export default function Inventory({ player }: { player: PlayerState }) {

  const equipedIds = [
    player.equipped.armour,
    player.equipped.helmet,
    player.equipped.weapon,
  ].filter(i => !!i);
  const isEquiped = (item: PlayerItem) => equipedIds.includes(item.id);

  return (
    <div className={styles.inventoryGrid}>
      {player.equipment.map(item => {
        const position = item.iconXY;

        return (
          <div
            key={item.id}
            className={`${styles.inventoryItem} ${isEquiped(item) ? styles.equippedItem : ''}`}
            role="img"
            aria-label={item.name}
            title={item.name}
            style={position ? {
              backgroundPosition: `-${position.x * 78 + 6}px -${position.y * 78 + 6}px`,
            } : undefined}
          />
        );
      })}
    </div>
  );
}