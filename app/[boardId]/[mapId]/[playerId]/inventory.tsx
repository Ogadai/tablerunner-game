import { PlayerState } from '@/lib/store/types';
import { Popover } from 'radix-ui';
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
        const bonuses = Object.entries(item.bonusStats || {}).filter(([, value]) => value !== undefined);

        return (
          <Popover.Root key={item.id} modal={true}>
            <Popover.Trigger asChild>
              <button
                type="button"
                className={`${styles.inventoryItem} ${isEquiped(item) ? styles.equippedItem : ''}`}
                aria-label={item.name}
                title={item.name}
                style={position ? {
                  backgroundPosition: `-${position.x * 78 + 6}px -${position.y * 78 + 6}px`,
                } : undefined}
              />
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content className={`PopoverContent ${styles.itemPopover}`}>
                <h3>{item.name}</h3>
                {bonuses.length > 0 ? (
                  <ul>
                    {bonuses.map(([stat, value]) => (
                      <li key={stat} className={styles.statEntry}>
                        <span className={styles.statName}>{stat}</span>
                        <span className={styles.statValue}>+{value}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No bonuses</p>
                )}
                <Popover.Arrow className="PopoverArrow" width={15} height={10} />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        );
      })}
    </div>
  );
}