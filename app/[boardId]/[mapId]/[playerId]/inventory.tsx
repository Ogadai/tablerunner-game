import { INamedTarget, PlayerInventoryEquipSlots } from '@/lib/store/types';
import styles from './inventory-item.module.css';
import { PlayerItem } from '@/lib/games/types';
import { allItems } from '@/lib/games/items';
import InventoryItem from './inventory-item';

export default function Inventory({
  player,
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
  const isEquipped = (item: PlayerItem) => {
    return player.equipped[allItems[item.type].type as keyof PlayerInventoryEquipSlots] === item.id;
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
          baseStats={player.baseStats!}
          playerSpells={player.spells}
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
