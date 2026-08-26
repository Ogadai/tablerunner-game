'use client'
import { notFound } from "next/navigation";
import { useState, useEffect } from 'react';
import Image from 'next/image';

import { ApiResponse } from "@/lib/api-response";
import { getGamesForMap } from "@/lib/games/gameList";
import { GameListEntry } from "@/lib/games/types";
import { createNewGameState } from "@/lib/store/gameState";
import styles from "./create-game.module.css";

export default function CreateGame(
  { boardId, mapId }
  : { boardId: string, mapId: string }
) {
  const [gameList, setGameList] = useState<ApiResponse<GameListEntry[]> | null>(null);

  useEffect(() => {
    async function fetchGames() {
      const games = await getGamesForMap(mapId);
      setGameList(games);
    }

    fetchGames();
  }, [mapId]);

  if (!gameList) {
    return <p>Loading...</p>;
  }

  if (!gameList.success) {
    notFound();
  }

  const bindCreateNewGameAction = (gameId: string) => {
    return async () => {
      await createNewGameState(boardId, mapId, gameId);
    };
  };

  return (<>
    <ul className={styles.gameList}>
      {gameList.data?.map((game) => (
        <li key={game.id}>
          <div className="card">
            <form action={bindCreateNewGameAction(game.id)}>
              <h4>{game.name}</h4>
              <Image
                className={styles.createGameHero}
                src={game.heroImage}
                width={1400}
                height={1100}
                loading="eager"
                alt="The Hero image for TableRunner, showing a barbarian and a witch"
              />

              <p>{game.description}</p>
              <button type="submit">New Game</button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  </>);
}
