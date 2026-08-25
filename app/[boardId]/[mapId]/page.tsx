'use client'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react';

import { ApiResponse } from "@/lib/api-response";
import { getGameState } from "@/lib/store/gameState";
import { GameState } from "@/lib/store/types";

import CreateGame from './create-game';
import PlayGame from './play-game';

import ErrorComponent from '../../error';

export default function Page() {
  const params = useParams();
  const boardId = params.boardId?.toString() || '';
  const mapId = params.mapId?.toString() || '';
  const [gameState, setGameState] = useState<ApiResponse<GameState> | null>(null);

  useEffect(() => {
    async function fetchGameState() {
      const state = await getGameState(boardId, mapId);
      setGameState(state);
    }

    fetchGameState();
  }, [boardId, mapId]);

  if (!gameState) {
    return <p>Loading...</p>;
  }

  if (!gameState.success) {
    return <ErrorComponent error={new Error(gameState.error)} />;
  }

  const onCreateGame = (newGameState: GameState) => {
    setGameState({ success: true, data: newGameState });
  }

  const onDeleteGame = () => {
    setGameState({ success: true, data: undefined });
  }

  return (<div><main>
    {gameState.data && <PlayGame boardId={boardId} mapId={mapId} name={gameState.data.name} onDeleteGame={onDeleteGame} />}
    {!gameState.data && <CreateGame boardId={boardId} mapId={mapId} onCreateGame={onCreateGame} />}
  </main></div>);
}
