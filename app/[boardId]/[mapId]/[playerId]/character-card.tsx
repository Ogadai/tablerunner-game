import { useState, useEffect } from "react";

import styles from './character-card.module.css';

import { PlayerInventoryState, PlayerState } from '@/lib/store/types';
import CharacterStats from './character-stats';
import Inventory from './inventory';
import { getPlayerInventory, playerEquipItem } from '@/lib/store/playerInventory';
import { ApiResponse } from "@/lib/api-response";

export default function CharacterCard({
  boardId,
  mapId,
  player,
  isSelf,
  onUseItem,
}: {
  boardId: string;
  mapId: string;
  player: PlayerState;
  isSelf: boolean;
  onUseItem: (id: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'stats' | 'inventory'>('stats');
  const [activePlayer, setActivePlayer] = useState<PlayerState>(player);

  useEffect(() => {
    const fetchPlayerInventory = async () => {
      const response = await getPlayerInventory(boardId, mapId, player.id);
      useInventoryResponse(response);
    }

    if (isSelf) {
      fetchPlayerInventory();
    }
  }, [player]);

  const useInventoryResponse = (response: ApiResponse<PlayerInventoryState>) => {
    if (response.success && response.data?.equipped) {
      const combinedPlayer = {
        ...player,
        equipped: {
          ...player.equipped,
          ...response.data.equipped
        }
      };

      setActivePlayer(combinedPlayer);
    }
  }

  const onEquipItem = async (itemId: string) => {
    const response = await playerEquipItem(boardId, mapId, player.id, itemId);
    useInventoryResponse(response);
  }

  return <>
    <div className={styles.tabs} role="tablist" aria-label="Character details">
      {(['stats', 'inventory'] as const).map(tab => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={activeTab === tab}
          aria-controls={`${tab}-panel`}
          className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ''}`}
          onClick={() => setActiveTab(tab)}
        >
          {tab === 'stats' ? 'Stats' : 'Inventory'}
        </button>
      ))}
    </div>

    <div className={`${styles.tabContent} ${activeTab === 'stats' ? styles.tabContentFirst : ''}`}
      id={`${activeTab}-panel`} role="tabpanel" aria-label={activeTab === 'stats' ? 'Stats' : 'Inventory'}>
      {activeTab === 'stats'
        ? <CharacterStats boardId={boardId} mapId={mapId} player={activePlayer} isSelf={isSelf} />
        : <Inventory player={activePlayer} isSelf={isSelf} onEquipItem={onEquipItem} onUseItem={onUseItem} />}
    </div>
  </>;
};
