import { useState } from "react";

import tabStyles from './tabs.module.css';

import { INamedTarget, NPCState, PlayerState } from '@/lib/store/types';
import CharacterStats from './character-stats';
import Inventory from './inventory';
import { dropItemAtLocation, playerEquipItem } from '@/lib/store/playerInventory';
import { PlayerItem } from "@/lib/games/types";
import playerStatsSyncService, { PlayerStats } from "./player-stats-sync.service";
import NpcCard from './npc-card';

export default function CharacterCard({
  boardId,
  mapId,
  player,
  viewer,
  isSelf,
  actionPointsLeft,
  playerStats,
  onUseItem,
  onLearnScroll,
  usedItemIds,
  onHired,
  followerNPCs,
}: {
  boardId: string;
  mapId: string;
  player: INamedTarget | PlayerState;
  viewer: PlayerState;
  isSelf: boolean;
  actionPointsLeft: number;
  playerStats: PlayerStats | null;
  onUseItem: (item: PlayerItem) => void;
  onLearnScroll: (item: PlayerItem) => void;
  usedItemIds: string[];
  onHired: () => void;
  followerNPCs?: NPCState[];
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

  const onTakeItem = ((player as NPCState).masterId === viewer.id && viewer.health > 0)
    ? async (item: PlayerItem) => {
      // TODO: remove the item from the NPC's inventory and add it to the player's inventory,
      // without updating the GameState (i.e. the NPC needs its own PlayerInventoryState that
      // can be merged into GameState when the next turn runs)
    } : undefined;

  const onGiveItem = (followerNPCs && followerNPCs.length > 0 && viewer.health > 0)
    ? async (item: PlayerItem) => {
      // TODO: show a popup to pick one of the follower NPCS, then (if the user doesn't cancel),
      // add the item to the follower NPC and remove from the player's inventory,
      // without updating the GameState (i.e. the NPC needs its own PlayerInventoryState that
      // can be merged into GameState when the next turn runs)
    } : undefined;

  const playerState = (player as PlayerState).characterStats ? (player as PlayerState) : null;

  return <>
    <div className={tabStyles.tabs} role="tablist" aria-label="Character details">
      {(['stats', 'inventory'] as const).map(tab => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={activeTab === tab}
          aria-controls={`${tab}-panel`}
          className={`${tabStyles.tab} ${activeTab === tab ? tabStyles.activeTab : ''}`}
          onClick={() => setActiveTab(tab)}
        >
          {tab === 'stats' ? 'Stats' : 'Inventory'}
        </button>
      ))}
    </div>

    <div className={`${tabStyles.tabContent} ${activeTab === 'stats' ? tabStyles.tabContentFirst : ''}`}
      id={`${activeTab}-panel`} role="tabpanel" aria-label={activeTab === 'stats' ? 'Stats' : 'Inventory'}>
      {activeTab === 'stats'
        ? (playerState ? <CharacterStats
            boardId={boardId}
            mapId={mapId}
            player={playerState}
            playerStats={playerStats}
            isSelf={isSelf}
          />
          :
          <NpcCard
            boardId={boardId}
            mapId={mapId}
            npc={player as NPCState}
            player={viewer}
            onHired={onHired}
          />)
        : <Inventory
            player={player}
            isSelf={isSelf}
            isDead={(playerStats ? playerStats.health : player.health) === 0}
            actionPointsLeft={actionPointsLeft}
            onEquipItem={onEquipItem}
            onUseItem={onUseItem}
            onLearnScroll={onLearnScroll}
            onDropItem={onDropItem}
            onTakeItem={onTakeItem}
            onGiveItem={onGiveItem}
            usedItemIds={usedItemIds}
          />}
    </div>
  </>;
};
