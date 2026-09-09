'use client';

import { useState, useEffect } from 'react';
import { Dialog } from 'radix-ui';
import tabStyles from './tabs.module.css';
import { getStoreInventoryState } from '@/lib/store/playerInventory';
import { PlayerState, StoreInventoryState } from '@/lib/store/types';

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
          />
          <Dialog.Close className="DialogClose btn-secondary material-symbols-outlined" aria-label="Close">
            close
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
