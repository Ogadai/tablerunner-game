'use client'
import { useParams } from 'next/navigation'
import useGameStateSnapshot from './game/use-game-state-snapshot';

import CreateGame from './create-game';
import PlayGame from './game/play-game';

export default function Page() {
  const params = useParams();
  const boardId = params.boardId?.toString() || '';
  const mapId = params.mapId?.toString() || '';
  const { gameState, loading } = useGameStateSnapshot(boardId, mapId);

  if (loading) {
    return <p>Loading...</p>;
  }

  return (<>
    {gameState && <PlayGame boardId={boardId} mapId={mapId} name={gameState.name} gameState={gameState} />}
    {!gameState && <CreateGame boardId={boardId} mapId={mapId} />}
  </>);
}
