import { INamedTarget } from '@/lib/store/types';
import styles from './inventory-item.module.css';
import { PlayerItem } from '@/lib/games/types';
import { getCharacterType } from '@/lib/games/spells';
import InventoryItem, { getEquippedItemInSlot } from './inventory-item';

export default function Inventory({
  player,
  disabled = false,
  isSelf,
  actionPointsLeft,
  isDead,
  onEquipItem,
  onUseItem,
  onDropItem,
  onGiveItem,
  onTakeItem,
  onLearnScroll,
  usedItemIds
}: {
  player: INamedTarget;
  disabled?: boolean;
  isSelf: boolean,
  actionPointsLeft: number;
  isDead: boolean;
  onEquipItem: (item: PlayerItem) => void;
  onUseItem: (item: PlayerItem) => void;
  onDropItem: (item: PlayerItem) => void;
  onGiveItem?: (item: PlayerItem) => void;
  onTakeItem?: (item: PlayerItem) => void;
  onLearnScroll: (item: PlayerItem) => void;
  usedItemIds: string[];
}) {
  const isEquipped = (item: PlayerItem) =>
    getEquippedItemInSlot(player.equipped, player.equipment, item.type)?.id === item.id;
  const isUsed = (item: PlayerItem) => {
    return usedItemIds.includes(item.id || '');
  };
  const orderedEquipment = [...player.equipment].sort((a, b) => Number(isEquipped(b)) - Number(isEquipped(a)));

  return (
    <div className={styles.inventoryGrid}>
      {orderedEquipment.map(item => {
        const equippedInSlot = getEquippedItemInSlot(player.equipped, player.equipment, item.type);
        const itemEquipped = equippedInSlot?.id === item.id;
        return <InventoryItem
          isSelf={isSelf}
          disabled={disabled}
          isDead={isDead}
          key={`${item.id}}`}
          item={item}
          isEquipped={itemEquipped}
          equippedItem={itemEquipped ? undefined : equippedInSlot}
          isUsed={isUsed(item)}
          actionPointsLeft={actionPointsLeft}
          baseStats={player.baseStats!}
          playerSpells={player.spells}
          characterType={getCharacterType(player)}
          onEquipped={() => onEquipItem(item)}
          onUsed={() => onUseItem(item)}
          onDropped={() => onDropItem(item)}
          onGive={onGiveItem ? () => onGiveItem(item) : undefined}
          onTake={onTakeItem ? () => onTakeItem(item) : undefined}
          onLearnScroll={() => onLearnScroll(item)}
        />;
      })}
    </div>
  );
}
