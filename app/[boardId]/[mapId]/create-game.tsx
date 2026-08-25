'use client'
import { notFound } from "next/navigation";
import { useState, useEffect } from 'react';
import Image from 'next/image';

import { ApiResponse } from "@/lib/api-response";
import { getGamesForMap } from "@/lib/games/gameList";
import { GameListEntry } from "@/lib/games/types";
import { createNewGameState } from "@/lib/store/gameState";
import { GameState } from "@/lib/store/types";
import styles from "./create-game.module.css";

export default function CreateGame(
  { boardId, mapId, onCreateGame }
  : { boardId: string, mapId: string, onCreateGame: (gameState: GameState) => void }
) {
  const [gameList, setGameList] = useState<ApiResponse<GameListEntry[]> | null>(null);

  useEffect(() => {
    async function fetchGames() {
      const games = await getGamesForMap(mapId);
      setGameList(games);
    }

    fetchGames();
  }, []);

  if (!gameList) {
    return <p>Loading...</p>;
  }

  if (!gameList.success) {
    notFound();
  }

  const bindCreateNewGameAction = (gameId: string) => {
    return async (formData: FormData) => {
      const newGame = await createNewGameState(boardId, mapId, gameId);
      if (newGame.success && newGame.data) {
        onCreateGame(newGame.data);
      }
    };
  };

  return (<>
    <h3>Welcome to TableRunner</h3>
    <p>Please choose one of these games</p>
    <ul>
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
