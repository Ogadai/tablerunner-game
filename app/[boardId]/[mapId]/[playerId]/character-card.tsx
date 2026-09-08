import { useState } from "react";

import styles from './character-card.module.css';

import { PlayerState } from '@/lib/store/types';
import CharacterStats from './character-stats';
import Inventory from './inventory';
import { dropItemAtLocation, playerEquipItem } from '@/lib/store/playerInventory';
import { PlayerItem } from "@/lib/games/types";
import playerStatsSyncService, { PlayerStats } from "./player-stats-sync.service";

export default function CharacterCard({
  boardId,
  mapId,
  player,
  isSelf,
  actionPointsLeft,
  playerStats,
  onUseItem,
  onLearnScroll,
  usedItemIds,
}: {
  boardId: string;
  mapId: string;
  player: PlayerState;
  isSelf: boolean;
  actionPointsLeft: number;
  playerStats: PlayerStats | null;
  onUseItem: (item: PlayerItem) => void;
  onLearnScroll: (item: PlayerItem) => void;
  usedItemIds: string[];
}) {
  const [activeTab, setActiveTab] = useState<'stats' | 'inventory'>('stats');

  const onEquipItem = async (item: PlayerItem) => {
    const response = await playerEquipItem(boardId, mapId, player.id, item.id);
    playerStatsSyncService.updateInventory(response.data);
  }

  const onDropItem = async (item: PlayerItem) => {
    const response = await dropItemAtLocation(boardId, mapId, player.id, item.id);
    playerStatsSyncService.updateInventory(response.data);
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
        ? <CharacterStats
            boardId={boardId}
            mapId={mapId}
            player={player}
            playerStats={playerStats}
            isSelf={isSelf}
          />
        : <Inventory
            player={player}
            isSelf={isSelf}
            isDead={(playerStats ? playerStats.health : player.health) === 0}
            actionPointsLeft={actionPointsLeft}
            onEquipItem={onEquipItem}
            onUseItem={onUseItem}
            onLearnScroll={onLearnScroll}
            onDropItem={onDropItem}
            usedItemIds={usedItemIds}
          />}
    </div>
  </>;
};
