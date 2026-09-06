import { useState } from 'react';
import { PlayerState } from '@/lib/store/types';
import { Popover } from 'radix-ui';
import styles from './inventory.module.css';
import { ConsumableItemDef, PlayerItem, PlayerItemType } from '@/lib/games/types';
import { allItems } from '@/lib/games/items';

export default function Inventory({ player, isSelf, actionPointsLeft, isDead, onEquipItem, onUseItem, onDropItem, usedItemIds }: {
  player: PlayerState;
  isSelf: boolean,
  actionPointsLeft: number;
  isDead: boolean;
  onEquipItem: (item: PlayerItem) => void;
  onUseItem: (item: PlayerItem) => void;
  onDropItem: (item: PlayerItem) => void;
  usedItemIds: string[];
}) {
  const isEquipped = (item: PlayerItem) => {
    return (player.equipped as any)[allItems[item.type].type] === item.id;
  };
  const isUsed = (item: PlayerItem) => {
    return usedItemIds.includes(item.id || '');
  };

  return (
    <div className={styles.inventoryGrid}>
      {player.equipment.map(item => {
        return <InventoryItem
          isSelf={isSelf}
          isDead={isDead}
          key={`${item.id}}`}
          item={item}
          isEquipped={isEquipped(item)}
          isUsed={isUsed(item)}
          actionPointsLeft={actionPointsLeft}
          onEquipped={() => onEquipItem(item)}
          onUsed={() => onUseItem(item)}
          onDropped={() => onDropItem(item)}
        />;
      })}
    </div>
  );
}

function InventoryItem({
  isSelf,
  isDead,
  item,
  isEquipped,
  isUsed,
  actionPointsLeft,
  onEquipped,
  onUsed,
  onDropped,
}: {
  isSelf: boolean,
  isDead: boolean,
  item: PlayerItem;
  isEquipped: boolean;
  isUsed: boolean;
  actionPointsLeft: number;
  onEquipped: () => void;
  onUsed: () => void;
  onDropped: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const itemDef = allItems[item.type];
  const position = itemDef.iconXY;
  const bonuses = Object.entries(itemDef.bonusStats || {}).filter(([, value]) => value !== undefined);

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
  const isEquipable = itemDef.type !== PlayerItemType.consumable;
  const isConsumable = itemDef.type === PlayerItemType.consumable;
  const canUse = isConsumable && !isUsed && actionPointsLeft >= (itemDef as ConsumableItemDef).useCost;
  const canDrop = !isUsed;

  return (
    <Popover.Root modal={true} open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`${styles.inventoryItem} ${isEquipped ? styles.equippedItem : ''}`}
          aria-label={itemDef.name}
          title={itemDef.name}
        >
          <span className={styles.itemIcon}
            style={position ? {
              backgroundPosition: `-${position.x * 60}px -${position.y * 60}px`,
              transform: itemDef.iconScale ? `scale(${itemDef.iconScale})` : undefined,
            } : undefined}
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className={`PopoverContent ${styles.itemPopover}`}>
          <h3>{itemDef.name}</h3>
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
            {isSelf && !isDead && canDrop && (
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