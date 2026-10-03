import { startTransition, useEffect, useRef, useState, useTransition } from "react";
import { Dialog } from 'radix-ui';

import tabStyles from './tabs.module.css';

import { getDisplayName, INamedTarget, NPCState, PlayerInventoryState, PlayerState } from '@/lib/store/types';
import CharacterStats from './character-stats';
import Inventory from './inventory';
import { dropItemAtLocation, getPlayerInventory, giveItemToNpc, playerEquipItem, takeItemFromNpc } from '@/lib/store/playerInventory';
import { PlayerItem } from "@/lib/games/types";
import playerStatsSyncService, { PlayerStats } from "./player-stats-sync.service";
import NpcCard from './npc-card';
import { getCombatStats, getPlayerStats } from '@/lib/store/playerStats';
import { allItems } from '@/lib/games/items';
import EntityList, { EntityItemClass } from './entity-list';

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
  const [inventoryResult, setInventoryResult] = useState<{
    source: INamedTarget;
    inventory?: PlayerInventoryState;
    error?: string;
  } | null>(null);
  const [reloadInventory, setReloadInventory] = useState(0);
  const [giveItem, setGiveItem] = useState<PlayerItem | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferring, startTransfer] = useTransition();
  const inventoryRequest = useRef(0);

  useEffect(() => {
    if (isSelf) return;
    const request = ++inventoryRequest.current;
    startTransition(async () => {
      try {
        const response = await getPlayerInventory(boardId, mapId, player.id);
        if (request !== inventoryRequest.current) return;
        setInventoryResult({
          source: player,
          inventory: response.success ? response.data : undefined,
          error: response.success && response.data ? undefined : response.error || 'Unable to load inventory.',
        });
      } catch {
        if (request === inventoryRequest.current) {
          setInventoryResult({ source: player, error: 'Unable to load inventory.' });
        }
      }
    });
    return () => { inventoryRequest.current = request + 1; };
  }, [boardId, mapId, player, isSelf, reloadInventory]);

  const currentInventory = !isSelf && inventoryResult?.source === player ? inventoryResult : null;
  const pendingInventory = currentInventory?.inventory;
  const loadingInventory = !isSelf && !currentInventory;
  const displayPlayer = pendingInventory ? {
    ...player,
    equipment: pendingInventory.equipment ?? player.equipment,
    equipped: { ...player.equipped, ...pendingInventory.equipped },
  } : player;

  const transferItem = (npcId: string, item: PlayerItem, direction: 'give' | 'take') => {
    if (transferring) return;
    const request = inventoryRequest.current;
    setTransferError(null);
    startTransfer(async () => {
      try {
        const action = direction === 'give' ? giveItemToNpc : takeItemFromNpc;
        const response = await action(boardId, mapId, viewer.id, npcId, item.id);
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Unable to transfer item.');
        }
        playerStatsSyncService.updateInventory(response.data.playerInventory);
        if (request === inventoryRequest.current) {
          if (!isSelf && player.id === npcId) {
            setInventoryResult({ source: player, inventory: response.data.npcInventory });
          }
          setGiveItem(null);
        }
      } catch (error) {
        if (request === inventoryRequest.current) setTransferError((error as Error).message);
      }
    });
  };

  const onEquipItem = async (item: PlayerItem) => {
    const response = await playerEquipItem(boardId, mapId, player.id, item.id);
    playerStatsSyncService.updateInventory(response.data);
  }

  const onDropItem = async (item: PlayerItem) => {
    const response = await dropItemAtLocation(boardId, mapId, player.id, item.id);
    playerStatsSyncService.updateInventory(response.data);
  }

  const onTakeItem = ((player as NPCState).masterId === viewer.id && viewer.health > 0 && pendingInventory && !transferring)
    ? (item: PlayerItem) => transferItem(player.id, item, 'take') : undefined;

  const availableFollowers = (followerNPCs || []).filter(npc =>
    npc.masterId === viewer.id && npc.location.id === viewer.location.id && npc.health > 0);
  const onGiveItem = (isSelf && availableFollowers.length > 0 && viewer.health > 0 && !transferring)
    ? (item: PlayerItem) => {
      setTransferError(null);
      setGiveItem(item);
    } : undefined;

  const playerState = (displayPlayer as PlayerState).characterStats ? (displayPlayer as PlayerState) : null;
  const displayedPlayerState = playerState && pendingInventory ? {
    ...playerState,
    coins: pendingInventory.coins ?? playerState.coins,
    baseStats: getPlayerStats(playerState),
  } : playerState;

  return <>
    {loadingInventory && <p className={tabStyles.transferMsg} role="status">Loading...</p>}
    {currentInventory?.error && <p role="alert">
      {currentInventory.error}{' '}
      <button type="button" onClick={() => {
        setInventoryResult(null);
        setReloadInventory(value => value + 1);
      }}>Retry</button>
    </p>}
    {transferError && !giveItem && <p className={tabStyles.transferMsg} role="alert">{transferError}</p>}
    {transferring && <p className={tabStyles.transferMsg} role="status">Transferring...</p>}
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
        ? (displayedPlayerState ? <CharacterStats
            boardId={boardId}
            mapId={mapId}
            player={displayedPlayerState}
            playerStats={playerStats}
            isSelf={isSelf}
          />
          :
          <NpcCard
            boardId={boardId}
            mapId={mapId}
            npc={displayPlayer as NPCState}
            player={viewer}
            onHired={onHired}
          />)
        : <Inventory
            player={displayPlayer}
            disabled={loadingInventory || transferring}
            isSelf={isSelf}
            isDead={(playerStats ? playerStats.health : player.health) === 0}
            actionPointsLeft={actionPointsLeft}
            onEquipItem={onEquipItem}
            onUseItem={onUseItem}
            onLearnScroll={onLearnScroll}
            onDropItem={onDropItem}
            onTakeItem={onTakeItem}
            onGiveItem={onGiveItem}
            usedItemIds={isSelf ? usedItemIds : []}
          />}
    </div>
    <Dialog.Root open={giveItem !== null} onOpenChange={open => {
      if (!open && !transferring) setGiveItem(null);
    }}>
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay" />
        <Dialog.Content className={`DialogContent ${tabStyles.childPopover}`} aria-describedby={undefined}>
          <Dialog.Title className="DialogTitle">Give {giveItem ? allItems[giveItem.type].name : 'item'}</Dialog.Title>
          <div className="DialogContentBody">
            <EntityList
              entities={availableFollowers.map(npc => ({
                id: npc.id,
                name: getDisplayName(npc),
                iconXY: npc.iconXY,
                className: EntityItemClass.friendly,
                health: npc.health,
                maxHealth: npc.baseStats ? getCombatStats(npc).health : npc.health,
              }))}
              onClickEntity={npc => giveItem && transferItem(npc.id, giveItem, 'give')}
            >
            </EntityList>
            {transferError && <p role="alert">{transferError}</p>}
          </div>
          <Dialog.Close disabled={transferring} className="DialogClose btn-secondary material-symbols-outlined" aria-label="Cancel">close</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </>;
};
