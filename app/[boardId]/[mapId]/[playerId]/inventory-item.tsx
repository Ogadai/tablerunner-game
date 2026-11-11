import { useState } from 'react';
import { Popover } from 'radix-ui';
import styles from './inventory-item.module.css';
import { BaseStats, ConsumableItemDef, ItemDef, PlayerItem, PlayerItemType, ScrollItemDef } from '@/lib/games/types';
import { allItems, SELL_COST_RATIO } from '@/lib/games/items';
import { LEARN_SCROLL_ACTION_COST } from '@/lib/store/playerStats';
import { NOTHING_EQUPPED, PlayerInventoryEquipSlots } from '@/lib/store/types';
import { canCharacterLearnSpell, canCharacterUseSpell, getSpellLearningStatValue, SpellIds, spells } from '@/lib/games/spells';
import CoinDisplay from './coin-display';

type NumericBonusStat = keyof Omit<NonNullable<ItemDef['bonusStats']>, 'special'>;

interface ComparisonStatRow {
  stat: NumericBonusStat;
  itemValue?: number;
  equippedValue?: number;
}

export function getEquippedItemInSlot(
  equipped: PlayerInventoryEquipSlots | undefined,
  equipment: PlayerItem[] | undefined,
  itemType: string,
): PlayerItem | undefined {
  const itemDef = allItems[itemType];
  if (!itemDef || itemDef.type === PlayerItemType.consumable || itemDef.type === PlayerItemType.scroll) {
    return undefined;
  }
  const slot = itemDef.type as keyof PlayerInventoryEquipSlots;
  const equippedId = equipped?.[slot];
  if (!equippedId || equippedId === NOTHING_EQUPPED) {
    return undefined;
  }
  return equipment?.find(item => item.id === equippedId);
}

function getComparisonStatRows(itemDef: ItemDef, equippedItemDef?: ItemDef): ComparisonStatRow[] {
  const itemBonuses = itemDef.bonusStats || {};
  const equippedBonuses = equippedItemDef?.bonusStats || {};
  const stats = new Set<NumericBonusStat>();

  for (const [stat, value] of Object.entries(itemBonuses)) {
    if (stat !== 'special' && typeof value === 'number') stats.add(stat as NumericBonusStat);
  }
  for (const [stat, value] of Object.entries(equippedBonuses)) {
    if (stat !== 'special' && typeof value === 'number') stats.add(stat as NumericBonusStat);
  }

  return Array.from(stats).map(stat => ({
    stat,
    itemValue: itemBonuses[stat],
    equippedValue: equippedBonuses[stat],
  }));
}

function getComparisonColorClass(value: number, otherValue: number): string {
  if (value > otherValue) return styles.statBetter;
  if (value < otherValue) return styles.statWorse;
  return styles.statEqual;
}

export default function InventoryItem({
  isSelf,
  disabled = false,
  isDead,
  item,
  isEquipped,
  equippedItem,
  isUsed,
  actionPointsLeft,
  baseStats,
  playerSpells,
  characterType,
  onEquipped,
  onUsed,
  onDropped,
  onGive,
  onTake,
  onLearnScroll,
  onBuy,
  onSell,
  availableCoins,
}: {
  isSelf: boolean,
  disabled?: boolean,
  isDead: boolean,
  item: PlayerItem;
  isEquipped: boolean;
  equippedItem?: PlayerItem;
  isUsed: boolean;
  actionPointsLeft: number;
  baseStats: BaseStats,
  playerSpells?: SpellIds[],
  characterType?: string,
  onEquipped?: () => void;
  onUsed?: () => void;
  onDropped?: () => void;
  onGive?: () => void;
  onTake?: () => void;
  onLearnScroll?: () => void;
  onBuy?: () => void;
  onSell?: () => void;
  availableCoins?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const itemDef = allItems[item.type];
  const position = itemDef.iconXY;

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

  const onClickBuy = () => {
    setIsOpen(false);
    onBuy!();
  }
  
  const onClickSell = () => {
    setIsOpen(false);
    onSell!();
  }

  const isSlotEquipable = itemDef.type !== PlayerItemType.consumable && itemDef.type !== PlayerItemType.scroll;
  const isEquipable = !!onEquipped && isSlotEquipable;
  const equippedItemDef = !isEquipped && isSlotEquipable && equippedItem
    ? allItems[equippedItem.type]
    : undefined;
  const showComparison = !!equippedItemDef && equippedItemDef.type === itemDef.type;
  const statRows = getComparisonStatRows(itemDef, showComparison ? equippedItemDef : undefined);
  const specialText = itemDef.bonusStats?.special;
  const hasBonuses = statRows.length > 0 || !!specialText;

  const isConsumable = itemDef.type === PlayerItemType.consumable;
  const scrollSpell = itemDef.type === PlayerItemType.scroll
    ? spells[(itemDef as ScrollItemDef).spellId]
    : undefined;
  const scrollClass = scrollSpell?.characterType
    ? `${scrollSpell.characterType.charAt(0).toUpperCase()}${scrollSpell.characterType.slice(1)}`
    : undefined;
  const isMatchingClass = !!scrollSpell && (!characterType || canCharacterUseSpell({ id: characterType }, scrollSpell));
  const canUse = !!onUsed && !isUsed && isConsumable && actionPointsLeft >= (itemDef as ConsumableItemDef).useCost;
  const canDrop = !!onDropped && !isUsed;
  const canGive = !!onGive && !isUsed;
  const canTake = !!onTake && !isUsed;
  const canLearnSpell = !!onLearnScroll && !isUsed && !!scrollSpell
    && (characterType
      ? canCharacterLearnSpell({ id: characterType }, baseStats, scrollSpell)
      : getSpellLearningStatValue(scrollSpell, baseStats) >= scrollSpell.intelligence)
    && !playerSpells?.includes((itemDef as ScrollItemDef).spellId as SpellIds)
    && actionPointsLeft >= LEARN_SCROLL_ACTION_COST;

  const isDrinkable = /\b(Brew|Elixir)\b/i.test(itemDef.name)
    || scrollSpell?.characterType === 'barbarian'
    || scrollSpell?.characterType === 'ranger';
  const learnButtonText = isDrinkable ? 'Drink' : 'Learn';

  const cannotBuy = !!onBuy && ((availableCoins || 0) < (allItems[item.type].value || 0));
  const coins = onSell ? Math.ceil((itemDef.value || 0) * SELL_COST_RATIO) : itemDef.value || 0;

  const formatValue = (value: number) => `${value > 0 ? '+' : ''}${value}`;
  return (
    <Popover.Root modal={true} open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
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
          <h3 className={styles.itemHeader}>{itemDef.name}</h3>
          {scrollClass && (
            <p className={`${styles.itemClass} ${isMatchingClass ? styles.itemClassMatch : styles.itemClassMismatch}`}>
              {scrollClass} only
            </p>
          )}
          {coins > 0 && (!showComparison || !hasBonuses) && (
            <div className={styles.itemHeaderCoins}>
              <CoinDisplay coins={coins} />
            </div>
          )}
          {hasBonuses ? (
            <table className={styles.statsTable}>
              {showComparison && (
                <thead>
                  <tr>
                    <th className={styles.statName}>
                      {coins > 0 && <CoinDisplay coins={coins} />}
                    </th>
                    <th className={styles.statColumnHeader}>
                      <span className={styles.equippedHeader}>Current</span>
                    </th>
                    <th className={styles.statColumnHeader}>
                      <span className={styles.thisItemHeader}>This Item</span>
                    </th>
                  </tr>
                </thead>
              )}
              <tbody>
                {statRows.map(({ stat, itemValue, equippedValue }) => {
                  const itemText = itemValue !== undefined ? formatValue(itemValue) : '-';
                  if (!showComparison) {
                    return (
                      <tr key={stat}>
                        <td className={styles.statName}>{stat}</td>
                        <td className={`${styles.statValue} ${styles.statValueThis}`}>{itemText}</td>
                      </tr>
                    );
                  }
                  const equippedText = equippedValue !== undefined ? formatValue(equippedValue) : '-';
                  const itemNum = itemValue ?? 0;
                  const equippedNum = equippedValue ?? 0;
                  return (
                    <tr key={stat}>
                      <td className={styles.statName}>{stat}</td>
                      <td className={`${styles.statValue} ${getComparisonColorClass(equippedNum, itemNum)}`}>{equippedText}</td>
                      <td className={`${styles.statValue} ${styles.statValueThis} ${getComparisonColorClass(itemNum, equippedNum)}`}>{itemText}</td>
                    </tr>
                  );
                })}
                {specialText && (
                  <tr>
                    <td colSpan={showComparison ? 3 : 2} className={styles.statName}>{specialText}</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <p>No bonuses</p>
          )}
          <div className={styles.itemButtons}>
            {!isEquipped && !isDead && isSelf && isEquipable && (
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
              >{learnButtonText}</button>
            )}
            {isSelf && !isDead && canGive && (
              <button
                type="button"
                className={`btn ${styles.equipButton}`}
                onClick={() => { setIsOpen(false); onGive!(); }}
              >Give</button>
            )}
            {canTake && (
              <button
                type="button"
                className={`btn ${styles.equipButton}`}
                onClick={() => { setIsOpen(false); onTake!(); }}
              >Take</button>
            )}
            {isSelf && !isDead && canDrop && (
              <button
                type="button"
                className={`btn ${styles.equipButton}`}
                onClick={onClickDrop}
              >Drop</button>
            )}
            {!!onBuy && !isDead && !cannotBuy &&
              <button
                type="button"
                className={`btn ${styles.equipButton}`}
                onClick={onClickBuy}
              >Buy</button>
            }
            {!!onSell && coins > 0 && !isDead && !isUsed &&
              <button
                type="button"
                className={`btn ${styles.equipButton}`}
                onClick={onClickSell}
              >Sell</button>
            }
          </div>
          <Popover.Arrow className="PopoverArrow" width={15} height={10} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
