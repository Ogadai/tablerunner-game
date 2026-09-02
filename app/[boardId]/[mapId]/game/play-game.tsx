'use client'

import Image from 'next/image';
import Swal from 'sweetalert2'
import { swalDefaultOptions } from '@/app/swal';
import { useRouter } from 'next/navigation';

import styles from './play-game.module.css';
import { GameState, PlayerState } from "@/lib/store/types";
import { createPlayerForGame, deletePlayerFromGame } from '@/lib/store/gameState';
import { CharacterListEntry } from "@/lib/games/types";

export default function PlayGame(
  { boardId, mapId, name, gameState }
  : { boardId: string, mapId: string, name: string, gameState: GameState }
) {
  const router = useRouter();

  const bindCreateCharacterAction = (character: CharacterListEntry) => {
    const id = character.id;
    const name = character.defaultName;

    return async () => {
      await createPlayerForGame(boardId, mapId, id);
      await new Promise(r => setTimeout(r, 500));

      router.push(`/${boardId}/${mapId}/${id}`);
    };
  }

  const bindDeleteCharacterAction = (player: PlayerState) => 
    async () => {
      const result = await Swal.fire({
        ...swalDefaultOptions,
        title: 'Delete player?',
        icon: 'warning',
        text: "This will delete the current player. A new player can be created, but this one can't be restored.",
        showCancelButton: true,
        confirmButtonColor: 'var(--color-error)',
        confirmButtonText: 'Delete!'
      })

      if (result.isConfirmed) {
        await deletePlayerFromGame(boardId, mapId, player.id);
      }
    };

  const bindPlayAsCharacterAction = (player: PlayerState) => 
    async () => {
      router.push(`/${boardId}/${mapId}/${player.id}`);
    };
  
  const characterCard = (character: CharacterListEntry) => {
    const player = gameState.players?.find(p => p.id === character.id);

    const formAction = player ? bindDeleteCharacterAction(player) : bindCreateCharacterAction(character);
    const cardClass = player ? styles.playerCardExisting : styles.playerCardNew;

    return (<li key={character.id}>
        <div className={`${cardClass} card`}>
          <form action={formAction}>
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
            <div className={styles.playerCardButtons}>
              { !player && <button type="submit">Create</button> }
              { player && <>
                <button type="button" className="btn-secondary" onClick={bindPlayAsCharacterAction(player)}>Play</button>
                <button type="submit" className={`${styles.deleteButton} btn-delete material-symbols-outlined`}>delete_forever</button>
              </>}
            </div>
          </form>
        </div>
      </li>);
  }

  return (<>
    <ul className={styles.characterList}>
      {gameState.characters?.map((character) => (
        characterCard(character)
      ))}
    </ul>
  </>);
}