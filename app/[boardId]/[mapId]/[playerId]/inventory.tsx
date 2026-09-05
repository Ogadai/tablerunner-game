import { useState } from 'react';
import { PlayerState } from '@/lib/store/types';
import { Popover } from 'radix-ui';
import styles from './inventory.module.css';
import { PlayerConsumableItem, PlayerItem, PlayerItemType } from '@/lib/games/types';

export default function Inventory({ player, isSelf, actionPointsLeft, onEquipItem, onUseItem, onDropItem, usedItemUniqueIds }: {
  player: PlayerState;
  isSelf: boolean,
  actionPointsLeft: number;
  onEquipItem: (id: string, uniqueId?: string) => void;
  onUseItem: (id: string, uniqueId?: string) => void;
  onDropItem: (id: string, uniqueId?: string) => void;
  usedItemUniqueIds: string[];
}) {
  const isEquipped = (item: PlayerItem) => {
    return (player.equipped as any)[item.type] === item.id;
  };
  const isUsed = (item: PlayerItem) => {
    return item.type === PlayerItemType.consumable
      && usedItemUniqueIds.includes((item as PlayerConsumableItem).uniqueId || '');
  };

  return (
    <div className={styles.inventoryGrid}>
      {player.equipment.map(item => {
        return <InventoryItem
          isSelf={isSelf}
          key={`${item.uniqueId}}`}
          item={item}
          isEquipped={isEquipped(item)}
          isUsed={isUsed(item)}
          actionPointsLeft={actionPointsLeft}
          onEquipped={() => onEquipItem(item.id, item.uniqueId)}
          onUsed={() => onUseItem(item.id, item.uniqueId)}
          onDropped={() => onDropItem(item.id, item.uniqueId)}
        />;
      })}
    </div>
  );
}

function InventoryItem({
  isSelf,
  item,
  isEquipped,
  isUsed,
  actionPointsLeft,
  onEquipped,
  onUsed,
  onDropped,
}: {
  isSelf: boolean,
  item: PlayerItem;
  isEquipped: boolean;
  isUsed: boolean;
  actionPointsLeft: number;
  onEquipped: () => void;
  onUsed: () => void;
  onDropped: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const position = item.iconXY;
  const bonuses = Object.entries(item.bonusStats || {}).filter(([, value]) => value !== undefined);

  const onClickEquip = () => {
    setIsOpen(false);
    onEquipped();
  }

  const onClickUse = () => {
    setIsOpen(false);
    onUsed();
  }

  const onClickDrop = () => {
    setIsOpen(false);
    onDropped();
  }

  const isEquipable = item.type !== PlayerItemType.consumable;
  const isConsumable = item.type === PlayerItemType.consumable;
  const canUse = isConsumable && !isUsed && actionPointsLeft >= (item as PlayerConsumableItem).useCost;

  return (
    <Popover.Root modal={true} open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`${styles.inventoryItem} ${isEquipped ? styles.equippedItem : ''}`}
          aria-label={item.name}
          title={item.name}
        >
          <span className={styles.itemIcon}
            style={position ? {
              backgroundPosition: `-${position.x * 60}px -${position.y * 60}px`,
              transform: item.iconScale ? `scale(${item.iconScale})` : undefined,
            } : undefined}
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className={`PopoverContent ${styles.itemPopover}`}>
          <h3>{item.name}</h3>
          {bonuses.length > 0 ? (
            <ul>
              {bonuses.map(([stat, value]) => (
                <li key={stat} className={styles.statEntry}>
                  { (stat !== 'special')
                    ? <><span className={styles.statName}>{stat}</span><span className={styles.statValue}>+{value}</span></>
                    : <span className={styles.statName}>{value}</span>
                  }
                </li>
              ))}
            </ul>
          ) : (
            <p>No bonuses</p>
          )}
          <div className={styles.itemButtons}>
            {!isEquipped && isSelf && isEquipable && (
              <button
                type="button"
                className={`btn ${styles.equipButton}`}
                onClick={onClickEquip}
              >Equip</button>
            )}
            {isSelf && canUse && (
              <button
                type="button"
                className={`btn ${styles.equipButton}`}
                onClick={onClickUse}
              >Use</button>
            )}
            {isSelf && (
              <button
                type="button"
                className={`btn ${styles.equipButton}`}
                onClick={onClickDrop}
              >Drop</button>
            )}
          </div>
          <Popover.Arrow className="PopoverArrow" width={15} height={10} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}