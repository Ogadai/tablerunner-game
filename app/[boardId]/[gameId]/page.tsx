import styles from "./page.module.css";
import { gameList } from "../../../games/games";
import { notFound } from "next/navigation";

export default async function Page(props: { params: Promise<{ boardId: string, gameId: string }> }) {
  const params = await props.params;
  const boardId = params.boardId;
  const gameId = params.gameId;

  if (!(gameId in gameList)) {
    notFound();
  }

  return (
    <div>
      <main>
        <p>Board ID: {boardId}</p>
        <p>Game ID: {gameId}</p>
      </main>
    </div>
  );
}
