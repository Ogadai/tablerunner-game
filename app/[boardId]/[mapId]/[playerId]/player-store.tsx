'use client';

import { useState } from 'react';
import { Dialog } from 'radix-ui';
import tabStyles from './tabs.module.css';

export default function PlayerStore() {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');

  return (
    <Dialog.Root>
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
