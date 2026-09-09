import { PlayerState } from '@/lib/store/types';
import styles from './inventory.module.css';
import { PlayerItem } from '@/lib/games/types';
import { allItems } from '@/lib/games/items';
import InventoryItem from './inventory-item';

export default function Inventory({ player, isSelf, actionPointsLeft, isDead, onEquipItem, onUseItem, onDropItem, onLearnScroll, usedItemIds }: {
  player: PlayerState;
  isSelf: boolean,
  actionPointsLeft: number;
  isDead: boolean;
  onEquipItem: (item: PlayerItem) => void;
  onUseItem: (item: PlayerItem) => void;
  onDropItem: (item: PlayerItem) => void;
  onLearnScroll: (item: PlayerItem) => void;
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
          baseStats={player.baseStats!}
          onEquipped={() => onEquipItem(item)}
          onUsed={() => onUseItem(item)}
          onDropped={() => onDropItem(item)}
          onLearnScroll={() => onLearnScroll(item)}
        />;
      })}
    </div>
  );
}
