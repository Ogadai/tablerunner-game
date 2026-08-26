'use client'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react';

import { ApiResponse } from "@/lib/api-response";
import { getGameTopicId } from "@/lib/message-types";
import { getGameState } from "@/lib/store/gameState";
import gameStateSyncService from "./game/game-state-sync-service";
import { GameState } from "@/lib/store/types";

import CreateGame from './create-game';
import PlayGame from './game/play-game';
import GameTopicService from '../../message-bus/game-topic-service';

import ErrorComponent from '../../error';

export default function Page() {
  const params = useParams();
  const boardId = params.boardId?.toString() || '';
  const mapId = params.mapId?.toString() || '';
  const topicId = getGameTopicId(boardId, mapId);
  const [gameState, setGameState] = useState<ApiResponse<GameState> | null>(null);

  useEffect(() => {
    async function fetchGameState() {
      const state = await getGameState(boardId, mapId);
      setGameState(state);
      gameStateSyncService.set(boardId, mapId, state.success ? state.data : undefined);
    }

    fetchGameState();

    return GameTopicService.subscribe(topicId, fetchGameState);
  }, [boardId, mapId, topicId]);

  if (!gameState) {
    return <p>Loading...</p>;
  }

  if (!gameState.success) {
    return <ErrorComponent error={new Error(gameState.error)} />;
  }

  return (<div><main>
    {gameState.data && <PlayGame boardId={boardId} mapId={mapId} name={gameState.data.name} gameState={gameState.data} />}
    {!gameState.data && <CreateGame boardId={boardId} mapId={mapId} />}
  </main></div>);
}
