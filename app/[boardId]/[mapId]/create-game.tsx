'use client'
import { notFound } from "next/navigation";
import { useState, useEffect } from 'react';

import { ApiResponse } from "@/lib/api-response";
import { getGamesForMap } from "@/lib/games/gameList";
import { GameListEntry } from "@/lib/games/types";
import { createNewGameState } from "@/lib/store/gameState";
import { GameState } from "@/lib/store/types";

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
    <h2>Welcome to TableRunner</h2>
    <p>Please choose one of the following games</p>
    <ul>
      {gameList.data?.map((game) => (
        <li key={game.id}>
          <div className="card">
            <form action={bindCreateNewGameAction(game.id)}>
              <h3>{game.name}</h3>
              <p>{game.description}</p>
              <button type="submit">Create Game</button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  </>);
}
