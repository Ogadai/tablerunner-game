import styles from "./page.module.css";
import { gameList } from "../../../games/gamelist";
import { notFound } from "next/navigation";

export default async function Page(props: { params: Promise<{ boardId: string, mapId: string }> }) {
  const params = await props.params;
  const boardId = params.boardId;
  const mapId = params.mapId;

  const game = gameList.find((g) => g.map === mapId);
  if (!game) {
    notFound();
  }

  return (
    <div>
      <main>
        <p>Board ID: {boardId}</p>
        <p>Game ID: {game.id}</p>
      </main>
    </div>
  );
}
