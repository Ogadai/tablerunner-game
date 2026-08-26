'use client'
import { useEffect, useState } from "react";
import gameStateSyncService from "./game-state-sync-service";
import PlayHeaderMenu from './play-header-menu';
import styles from './play-header.module.css';

export default function PlayHeader(
  { boardId, mapId }
  : { boardId: string, mapId: string }
) {
  const [gameState, setGameState] = useState(() => gameStateSyncService.get(boardId, mapId));

  useEffect(() => gameStateSyncService.subscribe(boardId, mapId, setGameState), [boardId, mapId]);

  if (!gameState) {
    return <div className={styles.headerContainer}>
      <h3>Welcome to TableRunner</h3>
    </div>;
  }

  return (
    <div className={styles.headerContainer}>
      <div className={styles.headerContent}>
        
      </div>
      <PlayHeaderMenu boardId={boardId} mapId={mapId} />
    </div>
  );
}
