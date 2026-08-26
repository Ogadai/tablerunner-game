'use client'
import { useEffect, useState } from "react";
import { deleteGameState } from "@/lib/store/gameState";
import gameStateSyncService from "./game-state-sync-service";

export default function PlayHeader(
  { boardId, mapId }
  : { boardId: string, mapId: string }
) {
  const [gameState, setGameState] = useState(() => gameStateSyncService.get(boardId, mapId));

  useEffect(() => gameStateSyncService.subscribe(boardId, mapId, setGameState), [boardId, mapId]);

  const deleteGameAction = async () => {
    await deleteGameState(boardId, mapId);
  };

  if (!gameState) {
    return null;
  }

  return (
    <form action={deleteGameAction}>
      <button type="submit">X</button>
    </form>
  );
}
