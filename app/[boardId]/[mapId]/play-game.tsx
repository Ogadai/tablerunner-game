'use client'
import { deleteGameState } from "@/lib/store/gameState";

export default function PlayGame(
  { boardId, mapId, name, onDeleteGame }
  : { boardId: string, mapId: string, name: string, onDeleteGame: () => void }
) {

  const deleteGameAction = async (formData: FormData) => {
    await deleteGameState(boardId, mapId);
    onDeleteGame();
  };

  return (
    <form action={deleteGameAction}>
      <p>Playing game: {name}</p>
      <button type="submit">Delete Game</button>
    </form>
  );
}