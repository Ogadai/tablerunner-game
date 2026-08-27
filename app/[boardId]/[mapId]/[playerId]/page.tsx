'use client'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { setPlayerReady } from '@/lib/store/playerReadyState';
import readyStateSyncService from "../game/ready-state-sync-service";

import { ApiResponse } from "@/lib/api-response";
import { getGameTopicId } from "@/lib/message-types";
import { getGameState } from "@/lib/store/gameState";
// import gameStateSyncService from "./game/game-state-sync-service";
import { PlayerReadyState } from "@/lib/store/types";

// import CreateGame from './create-game';
// import PlayGame from './game/play-game';
// import GameTopicService from '../../message-bus/game-topic-service';

// import ErrorComponent from '../../error';

export default function Page() {
  const params = useParams();
  const boardId = params.boardId?.toString() || '';
  const mapId = params.mapId?.toString() || '';
  const playerId = params.playerId?.toString() || '';
  
  // const [gameState, setGameState] = useState<ApiResponse<GameState> | null>(null);
  const [readyState, setReadyState] = useState<PlayerReadyState>({ readyPlayerIds: [] });

  useEffect(() => {
    readyStateSyncService.subscribe(boardId, mapId, setReadyState);
    const state = readyStateSyncService.get(boardId, mapId);
    setReadyState(state);
    
    // async function fetchGameState() {
    //   const state = await getGameState(boardId, mapId);
    //   setGameState(state);
    //   gameStateSyncService.set(boardId, mapId, state.success ? state.data : undefined);
    // }

    // fetchGameState();

  }, [boardId, mapId, playerId]);

  const isPlayerReady = () => readyState.readyPlayerIds.includes(playerId);

  const endTurnAction = async () => {
    await setPlayerReady(boardId, mapId, playerId, !isPlayerReady());
  }

  return (<>
    <div>Player {playerId}</div>
    <form action={endTurnAction}>
      { !isPlayerReady() && <button type="submit">
        <span>End Turn</span>
        <span className={`${styles.endTurnCheck} material-symbols-outlined`}>check</span>
      </button> }
      { isPlayerReady() && <button type="submit" className="btn-delete">
        <span>Not Ready!</span>
        <span className={`${styles.notReadyCross} material-symbols-outlined`}>close</span>
      </button> }
    </form>
  </>);
}
