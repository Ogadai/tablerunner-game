'use client'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react';

import gameStateSyncService from "./game/game-state-sync-service";

import CreateGame from './create-game';
import PlayGame from './game/play-game';

export default function Page() {
  const params = useParams();
  const boardId = params.boardId?.toString() || '';
  const mapId = params.mapId?.toString() || '';
  const [gameState, setGameState] = useState(() => gameStateSyncService.get(boardId, mapId));

  useEffect(() => gameStateSyncService.subscribe(boardId, mapId, setGameState), [boardId, mapId]);

  if (gameStateSyncService.loading) {
    return <p>Loading...</p>;
  }

  return (<div><main>
    {gameState && <PlayGame boardId={boardId} mapId={mapId} name={gameState.name} gameState={gameState} />}
    {!gameState && <CreateGame boardId={boardId} mapId={mapId} />}
  </main></div>);
}
