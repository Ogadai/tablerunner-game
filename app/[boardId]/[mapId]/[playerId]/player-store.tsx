'use client';

import { useState } from 'react';
import { Dialog } from 'radix-ui';
import tabStyles from './tabs.module.css';
import styles from './player-store.module.css';
import { getStoreInventoryState } from '@/lib/store/playerInventory';
import { PlayerState, StoreInventoryState } from '@/lib/store/types';
import InventoryItem from './inventory-item';

export default function PlayerStore({
  boardId,
  mapId,
  player,
}: {
  boardId: string;
  mapId: string;
  player: PlayerState;
}) {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [storeInventory, setStoreInventory] = useState<StoreInventoryState>({ items: [] });
  
  const getStoreState = async () => {
    const result = await getStoreInventoryState(boardId, mapId, player.location.id);
    if (result.success && result.data) {
      setStoreInventory(result.data);
    }
  }

  const onOpenChange = (open: boolean) => {
    if (open) {
      getStoreState();
    }
  }

  return (
    <Dialog.Root onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <button type="button">Shop</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay" />
        <Dialog.Content className="DialogContent">
          <Dialog.Title className="DialogTitle">Store</Dialog.Title>
          <div className={tabStyles.tabs} role="tablist" aria-label="Store options">
            {(['buy', 'sell'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={`${tab}-panel`}
                className={`${tabStyles.tab} ${activeTab === tab ? tabStyles.activeTab : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'buy' ? 'Buy' : 'Sell'}
              </button>
            ))}
          </div>
          <div
            className={`${tabStyles.tabContent} ${activeTab === 'buy' ? tabStyles.tabContentFirst : ''}`}
            id={`${activeTab}-panel`}
            role="tabpanel"
            aria-label={activeTab === 'buy' ? 'Buy' : 'Sell'}
          >
            <div className={styles.storeGrid}>
              {activeTab === 'buy' && storeInventory.items.map(storeItem => {
                return (
                  <InventoryItem
                    key={storeItem.itemId}
                    isSelf={false}
                    isDead={player.health === 0}
                    item={{ id: storeItem.itemId, type: storeItem.itemId }}
                    isEquipped={false}
                    isUsed={false}
                    actionPointsLeft={0}
                    baseStats={player.baseStats!}
                    onBuy={() => {}}
                    availableCoins={player.coins}
                  />
                );
              })}
            </div>
          </div>
          <Dialog.Close className="DialogClose btn-secondary material-symbols-outlined" aria-label="Close">
            close
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
