'use client'

import Image from 'next/image';

import styles from './play-game.module.css';
import { GameState, PlayerState } from "@/lib/store/types";
import { createPlayerForGame, deletePlayerFromGame } from '@/lib/store/gameState';
import { CharacterListEntry } from "@/lib/games/types";

export default function PlayGame(
  { boardId, mapId, name, gameState }
  : { boardId: string, mapId: string, name: string, gameState: GameState }
) {
  const bindCreateCharacterAction = (character: CharacterListEntry) => {
    const id = character.id;
    const name = character.defaultName;

    return async () => {
      await createPlayerForGame(boardId, mapId, { id, name });
    };
  }

  const bindDeleteCharacterAction = (player: PlayerState) => 
    async () => {
      await deletePlayerFromGame(boardId, mapId, player.id);
    };
  
  const characterCard = (character: CharacterListEntry) => {
    const player = gameState.players?.find(p => p.id === character.id);

    const formAction = player ? bindDeleteCharacterAction(player) : bindCreateCharacterAction(character);
    return <form action={formAction}>
      <h4>{player ? player.name : character.prompt}</h4>
      <Image
        className={styles.playerHero}
        src={character.image}
        width={1400}
        height={1100}
        loading="eager"
        alt={character.prompt}
      />

      <p className={ styles.characterDesc }>{character.description}</p>
      { !player && <button type="submit">Create</button> }
      { player && <><button type="submit">Delete</button></> }
    </form>;
  }

  return (<>
    <ul className={styles.characterList}>
      {gameState.characters?.map((character) => (
        <li key={character.id}>
          <div className="card">
            {characterCard(character)}
          </div>
        </li>
      ))}
    </ul>
  </>);
}