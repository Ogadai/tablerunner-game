import { useState } from 'react';
import { PlayerState } from '@/lib/store/types';
import { Popover } from 'radix-ui';
import styles from './inventory.module.css';
import { PlayerItem, PlayerItemType } from '@/lib/games/types';

export default function Inventory({ player, isSelf, onEquipItem }: {
  player: PlayerState;
  isSelf: boolean,
  onEquipItem: (id: string) => void;
}) {
  const isEquipped = (item: PlayerItem) => {
    return (player.equipped as any)[item.type] === item.id;
  };

  return (
    <div className={styles.inventoryGrid}>
      {player.equipment.map(item => {
        return <InventoryItem
          isSelf={isSelf}
          key={item.id}
          item={item}
          isEquipped={isEquipped(item)}
          onEquipped={() => onEquipItem(item.id)}
        />;
      })}
    </div>
  );
}

function InventoryItem({
  isSelf,
  item,
  isEquipped,
  onEquipped,
}: {
  isSelf: boolean,
  item: PlayerItem;
  isEquipped: boolean;
  onEquipped: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const position = item.iconXY;
  const bonuses = Object.entries(item.bonusStats || {}).filter(([, value]) => value !== undefined);

  const onClickEquip = () => {
    setIsOpen(false);
    onEquipped();
  }

  const isEquipable = item.type !== PlayerItemType.consumable;

  return (
    <Popover.Root modal={true} open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`${styles.inventoryItem} ${isEquipped ? styles.equippedItem : ''}`}
          aria-label={item.name}
          title={item.name}
          style={position ? {
            backgroundPosition: `-${position.x * 80}px -${position.y * 80}px`,
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
          {!isEquipped && isSelf && isEquipable && (
            <button
              type="button"
              className={`btn ${styles.equipButton}`}
              onClick={onClickEquip}
            >Equip</button>
          )}
          <Popover.Arrow className="PopoverArrow" width={15} height={10} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}