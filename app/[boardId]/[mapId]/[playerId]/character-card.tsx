import { useState } from "react";

import styles from './character-card.module.css';

import { PlayerState } from '@/lib/store/types';
import CharacterStats from './character-stats';
import Inventory from './inventory';

export default function CharacterCard({
  boardId,
  mapId,
  player,
  isSelf,
}: {
  boardId: string;
  mapId: string;
  player: PlayerState;
  isSelf: boolean;
}) {
  const [activeTab, setActiveTab] = useState<'stats' | 'inventory'>('stats');

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
        ? <CharacterStats boardId={boardId} mapId={mapId} player={player} isSelf={isSelf} />
        : <Inventory player={player} />}
    </div>
  </>;
};
