'use client'
import { useEffect, useState } from "react";
import Swal from 'sweetalert2'
import { deleteGameState } from "@/lib/store/gameState";
import gameStateSyncService from "./game-state-sync-service";

export default function PlayHeader(
  { boardId, mapId }
  : { boardId: string, mapId: string }
) {
  const [gameState, setGameState] = useState(() => gameStateSyncService.get(boardId, mapId));

  useEffect(() => gameStateSyncService.subscribe(boardId, mapId, setGameState), [boardId, mapId]);

  const deleteGameAction = async () => {
    const result = await Swal.fire({
      title: 'Reset game?',
      icon: 'warning',
      text: "This will delete your current game and start a new game. This action cannot be undone!",
      showCancelButton: true,
      confirmButtonColor: 'var(--color-error)',
      confirmButtonText: 'Delete!'
    })

    if (result.isConfirmed) {
      await deleteGameState(boardId, mapId);
    }
  };

  if (!gameState) {
    return <h3>Welcome to TableRunner</h3>;
  }

  return (
    <button type="submit" onClick={deleteGameAction}>X</button>
  );
}
