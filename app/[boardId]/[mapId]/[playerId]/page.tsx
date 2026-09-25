'use client'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { setPlayerReady } from '@/lib/store/playerReadyState';
import readyStateSyncService from "../game/ready-state-sync-service";

import { PlayerReadyState } from "@/lib/store/types";
import { LocationMoveDirection } from "@/lib/games/types";
import PlayerLocation from './player-location';

import gameStateSyncService from "../game/game-state-sync-service";
import GameProcessingStartedService from '@/app/message-bus/game-processing-service';
import { getGameTopicId } from '@/lib/message-types';

export default function Page() {
  const router = useRouter();
  const params = useParams();
  const boardId = params.boardId?.toString() || '';
  const mapId = params.mapId?.toString() || '';
  const playerId = params.playerId?.toString() || '';
  
  const [readyState, setReadyState] = useState<PlayerReadyState>({ readyPlayerIds: [] });
  const [gameState, setGameState] = useState(() => gameStateSyncService.get(boardId, mapId));
  const [settingReady, setSettingReady] = useState(false);
  const [gameProcessing, setGameProcessing] = useState(false);
  const [turnError, setTurnError] = useState<string | null>(null);

  const topicId = getGameTopicId(boardId, mapId);

  useEffect(() => {
    const disposeGameState = gameStateSyncService.subscribe(boardId, mapId, state => {
      setGameState(state);
      setGameProcessing(false);
      if (!state) {
        router.push(`/${boardId}/${mapId}`);
      }
    });

    const disposeFn = GameProcessingStartedService.subscribe(topicId, processing => {
      setGameProcessing(processing);
      setTurnError(processing ? null : 'The turn failed. Please try again.');
    });
    return () => {
      disposeGameState();
      disposeFn();
    };
  }, [boardId, mapId, router, topicId]);

  useEffect(() => {
    readyStateSyncService.subscribe(boardId, mapId, setReadyState);
    const state = readyStateSyncService.get(boardId, mapId);
    setReadyState(state);
  }, [boardId, mapId, playerId]);

  const isPlayerReady = () => readyState.readyPlayerIds.includes(playerId);

  const endTurnAction = async (direction?: LocationMoveDirection) => {
    setSettingReady(true);
    setTurnError(null);
    try {
      const result = await setPlayerReady(boardId, mapId, playerId, !isPlayerReady(), direction);
      if (!result.success) {
        setGameProcessing(false);
        setTurnError(result.error || 'The turn failed. Please try again.');
      }
    } catch {
      setGameProcessing(false);
      setTurnError('Unable to submit the turn. Please try again.');
    } finally {
      setSettingReady(false);
    }
  }

  if (!gameState) {
    return <p>Loading...</p>;
  }

  return (<div className={styles.playerScreen}>
    <div className={styles.playerScreenContent}>
      {turnError && <p role="alert">{turnError}</p>}
      <PlayerLocation
        boardId={boardId}
        mapId={mapId}
        gameState={gameState}
        playerId={playerId}
        processing={settingReady || gameProcessing}
        isPlayerReady={isPlayerReady()}
        readyPlayerDirection={readyState.readyPlayerDirection}
        endTurnAction={endTurnAction}
      />
    </div>
  </div>);
}
