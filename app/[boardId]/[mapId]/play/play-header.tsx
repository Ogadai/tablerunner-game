'use client'
import { deleteGameState } from "@/lib/store/gameState";

export default function PlayHeader(
  { boardId, mapId }
  : { boardId: string, mapId: string }
) {

  const deleteGameAction = async () => {
    await deleteGameState(boardId, mapId);
  };

  return (
    <form action={deleteGameAction}>
      <button type="submit">X</button>
    </form>
  );
}
