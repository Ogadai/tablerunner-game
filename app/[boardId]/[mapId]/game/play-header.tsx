'use client'
import { useEffect, useState } from "react";
import Image from 'next/image';
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

  const bindSelectPlayerAction = (playerId: string) => {
    return async () => {
//      await createNewGameState(boardId, mapId, gameId);
    };
  };

  const getPlayerIcon = (characterId: string) =>
    gameState.characters.find(c => c.id === characterId)?.icon || '';

  return (
    <div className={styles.headerContainerGame}>
      <div className={styles.headerContent}>
        <ul className={styles.playerList}>
          {gameState.players?.map((player) => (
            <li key={player.id}>
              <Image
                className={styles.playerIcon}
                src={getPlayerIcon(player.id)}
                width={53}
                height={80}
                loading="eager"
                alt={player.name}
              />
            </li>
          ))}
        </ul>
      </div>
      <PlayHeaderMenu boardId={boardId} mapId={mapId} />
    </div>
  );
}
