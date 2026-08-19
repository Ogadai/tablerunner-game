import styles from "./page.module.css";

export default async function Page(props: { params: Promise<{ boardId: string, gameId: string }> }) {
  const params = await props.params;
  const boardId = params.boardId;
  const gameId = params.gameId;

  return (
    <div>
      <main>
        <p>Board ID: {boardId}</p>
        <p>Game ID: {gameId}</p>
      </main>
    </div>
  );
}
