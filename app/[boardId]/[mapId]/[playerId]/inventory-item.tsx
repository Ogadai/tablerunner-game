import { useState } from 'react';
import { Popover } from 'radix-ui';
import styles from './inventory-item.module.css';
import { BaseStats, ConsumableItemDef, PlayerItem, PlayerItemType, ScrollItemDef } from '@/lib/games/types';
import { allItems, SELL_COST_RATIO } from '@/lib/games/items';
import { LEARN_SCROLL_ACTION_COST } from '@/lib/store/playerStats';
import { spells } from '@/lib/games/spells';
import CoinDisplay from './coin-display';

export default function InventoryItem({
  isSelf,
  isDead,
  item,
  isEquipped,
  isUsed,
  actionPointsLeft,
  baseStats,
  onEquipped,
  onUsed,
  onDropped,
  onLearnScroll,
  onBuy,
  onSell,
  availableCoins,
}: {
  isSelf: boolean,
  isDead: boolean,
  item: PlayerItem;
  isEquipped: boolean;
  isUsed: boolean;
  actionPointsLeft: number;
  baseStats: BaseStats,
  onEquipped?: () => void;
  onUsed?: () => void;
  onDropped?: () => void;
  onLearnScroll?: () => void;
  onBuy?: () => void;
  onSell?: () => void;
  availableCoins?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const itemDef = allItems[item.type];
  const position = itemDef.iconXY;
  const bonuses = Object.entries(itemDef.bonusStats || {}).filter(([, value]) => value !== undefined);

  const onClickEquip = () => {
    setIsOpen(false);
    onEquipped!();
  }

  const onClickUse = () => {
    setIsOpen(false);
    onUsed!();
  }

  const onClickDrop = () => {
    setIsOpen(false);
    onDropped!();
  }
  const isEquipable = !!onEquipped && itemDef.type !== PlayerItemType.consumable && itemDef.type !== PlayerItemType.scroll;
  const isConsumable = itemDef.type === PlayerItemType.consumable;
  const canUse = !!onUsed && isConsumable && !isUsed && actionPointsLeft >= (itemDef as ConsumableItemDef).useCost;
  const canDrop = !!onDropped && !isUsed;
  const canLearnSpell = !!onLearnScroll && itemDef.type === PlayerItemType.scroll
    && baseStats.magic >= spells[(itemDef as ScrollItemDef).spellId].intelligence
    && actionPointsLeft >= LEARN_SCROLL_ACTION_COST;

  const cannotBuy = !!onBuy && ((availableCoins || 0) < (allItems[item.type].value || 0));
  const coins = onSell ? (itemDef.value || 0) * SELL_COST_RATIO : itemDef.value || 0;

  return (
    <Popover.Root modal={true} open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`${styles.inventoryItem} ${isEquipped ? styles.equippedItem : ''} ${cannotBuy ? styles.cannotBuy : ''}`}
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
          <div className={styles.itemHeader}>
            <h3>{itemDef.name}</h3>
            <CoinDisplay coins={coins} />
          </div>
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
            {isSelf && canLearnSpell && (
              <button
                type="button"
                className={`btn ${styles.equipButton}`}
                onClick={onLearnScroll}
              >Learn</button>
            )}
            {isSelf && !isDead && canDrop && (
              <button
                type="button"
                className={`btn ${styles.equipButton}`}
                onClick={onClickDrop}
              >Drop</button>
            )}
            {!!onBuy && !cannotBuy &&
              <button
                type="button"
                className={`btn ${styles.equipButton}`}
                onClick={onBuy}
              >Buy</button>
            }
            {!!onSell &&
              <button
                type="button"
                className={`btn ${styles.equipButton}`}
                onClick={onSell}
              >Sell</button>
            }
          </div>
          <Popover.Arrow className="PopoverArrow" width={15} height={10} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}