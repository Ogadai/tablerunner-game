'use client'
import { deleteGameState } from "@/lib/store/gameState";

export default function PlayGame(
  { boardId, mapId, name }
  : { boardId: string, mapId: string, name: string }
) {

  const deleteGameAction = async () => {
    await deleteGameState(boardId, mapId);
  };

  return (
    <form action={deleteGameAction}>
      <p>Playing game: {name}</p>
    </form>
  );
}