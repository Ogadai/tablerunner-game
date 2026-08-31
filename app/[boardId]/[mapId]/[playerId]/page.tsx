'use client'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { setPlayerReady } from '@/lib/store/playerReadyState';
import readyStateSyncService from "../game/ready-state-sync-service";

import { PlayerReadyState, PlayerState } from "@/lib/store/types";
import PlayerLocation from './player-location';

import gameStateSyncService from "../game/game-state-sync-service";

export default function Page() {
  const router = useRouter();
  const params = useParams();
  const boardId = params.boardId?.toString() || '';
  const mapId = params.mapId?.toString() || '';
  const playerId = params.playerId?.toString() || '';
  
  const [readyState, setReadyState] = useState<PlayerReadyState>({ readyPlayerIds: [] });
  const [gameState, setGameState] = useState(() => gameStateSyncService.get(boardId, mapId));

  useEffect(() => gameStateSyncService.subscribe(boardId, mapId, state => {
      setGameState(state);
      if (!state) {
        router.push(`/${boardId}/${mapId}`);
      }
    }), [boardId, mapId]);

  useEffect(() => {
    readyStateSyncService.subscribe(boardId, mapId, setReadyState);
    const state = readyStateSyncService.get(boardId, mapId);
    setReadyState(state);
    }, [boardId, mapId, playerId]);

  const isPlayerReady = () => readyState.readyPlayerIds.includes(playerId);

  const endTurnAction = async () => {
    await setPlayerReady(boardId, mapId, playerId, !isPlayerReady());
  }

  const playerState = gameState?.players.find(p => p.id === playerId) || null;
  if (!playerState) {
    return <p>Loading...</p>;
  }

  return (<div className={styles.playerScreen}>
    <div className={styles.playerScreenContent}>
      <PlayerLocation
        boardId={boardId}
        mapId={mapId}
        playerState={playerState}
        isPlayerReady={isPlayerReady()}
        endTurnAction={endTurnAction}
      />
    </div>
  </div>);
}
