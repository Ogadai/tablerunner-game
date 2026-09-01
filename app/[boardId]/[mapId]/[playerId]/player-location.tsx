import { useEffect, useState } from "react";
import Image from 'next/image';
import { useRouter } from 'next/navigation'

import { LocationMove } from "@/lib/games/types";
import { moveDescriptions, moveLabels, moveLabelOrder } from './move-descriptions';
import styles from './player-location.module.css';
import { PlayerAction, PlayerActionMove, PlayerActionsState, PlayerActionType, LocationState, GameState } from "@/lib/store/types";
import { addPlayerAction, getPlayerActionsState, removePlayerAction } from "@/lib/store/playerActionsState";
import { getLocationState } from '@/lib/store/locationState';
import { monsters } from '@/lib/games/monsters';

export default function PlayerLocation(
  {
    boardId,
    mapId,
    gameState,
    playerId,
    isPlayerReady,
    endTurnAction
  }: {
    boardId: string;
    mapId: string;
    gameState: GameState,
    playerId: string,
    isPlayerReady: boolean,
    endTurnAction: () => void
  }) {
  const [actionsState, setActionsState] = useState<PlayerActionsState>({ actions: [] });
  const [locationState, setLocationState] = useState<LocationState>({ monsters: [] });
  const router = useRouter();

  const playerState = gameState.players.find(p => p.id === playerId);
  const otherPlayers = gameState.players.filter(p => p.id !== playerId && p.location.id === playerState?.location.id);

  useEffect(() => {
    if (!playerState) {
      router.push(`/${boardId}/${mapId}`);
    } else {
      async function fetchPlayerActionState() {
        const state = await getPlayerActionsState(boardId, mapId, playerState!.id);
        setActionsState(state.data!);
      }

      async function fetchLocationState() {
        const state = await getLocationState(boardId, mapId, playerState!.location.id);
        setLocationState(state.data!);
      }

      fetchPlayerActionState();
      fetchLocationState();
    }
  }, [gameState]);

  const bindMoveAction = (locationMove: LocationMove) =>
    async () => {
      const actionNumber = actionsState.actions.reduce((number, action) => 
        Math.max(number, action.id + 1), 0);

      const moveAction: PlayerActionMove = {
        id: actionNumber,
        type: PlayerActionType.Move,
        description: moveDescriptions[locationMove.direction],
        direction: locationMove.direction
      };

      const state = await addPlayerAction(boardId, mapId, playerState!.id, moveAction);
      setActionsState(state.data!);

      endTurnAction();
    };
  
  const notReadyAction = async () => {
    const moveAction = actionsState.actions.find(a => a.type === PlayerActionType.Move);

    if (moveAction) {
      const state = await removePlayerAction(boardId, mapId, playerState!.id, moveAction.id);
      setActionsState(state.data!);
    }

    endTurnAction();
  }

  const bindRemoveAction = (action: PlayerAction) => 
    async () => {
      const state = await removePlayerAction(boardId, mapId, playerState!.id, action.id);
      setActionsState(state.data!);
    };

  const getPlayerIcon = (characterId: string) =>
    gameState.characters.find(c => c.id === characterId)?.icon || '';

  if (!playerState) {
    return <p>Loading...</p>;
  }

  return (<>
    <div className={styles.playerLocationScreen}>
      <div className={styles.playerHeader}>
        <h2>{playerState.name}</h2>
        <h4>Location {playerState.location.id}</h4>
      </div>
      <p>{playerState.location?.description}</p>
      <ul>
        <li key={playerState.id}
          className={`${styles.entity} ${styles.self}`}
        ><Image
          src={getPlayerIcon(playerState.id)}
          width={53}
          height={80}
          loading="eager"
          alt={playerState.name}
        /></li>
        { otherPlayers.map(player => 
          <li key={player.id}
            className={`${styles.entity} ${styles.friendly}`}
          ><Image
            src={getPlayerIcon(player.id)}
            width={53}
            height={80}
            loading="eager"
            alt={player.name}
          /></li>
        ) }
        { locationState.monsters.map(monster => 
          <li key={monster.key}
            className={`${styles.entity} ${styles.enemy}`}
          ><Image
            src={monsters[monster.id].icon}
            width={53}
            height={80}
            loading="eager"
            alt={monsters[monster.id].name}
          /></li>
        ) }
      </ul>
    
      { actionsState.actions.length > 0 && <div className={`${styles.actionsList} card`}>
        <h3>Actions</h3>
        <ul >
          { actionsState.actions.map(action => <li key={action.id}>
            <span>{ action.description }</span>
            <button
              onClick={bindRemoveAction(action)}
              className={`${styles.actionDeleteIcon} btn-delete material-symbols-outlined`}
            >delete_forever</button>
          </li>) }
        </ul>
      </div> }
    </div>

    <div className={styles.moveActionButtons}>
      {!isPlayerReady && playerState.location.move.sort((a1, a2) => moveLabelOrder[a1.direction] - moveLabelOrder[a2.direction]).map(mv => 
        <button type="button" key={mv.direction}
          className="material-symbols-outlined"
          onClick={bindMoveAction(mv)}
        >{moveLabels[mv.direction]}
        </button>
      )}

      { !isPlayerReady && <button type="submit" onClick={endTurnAction}>Stay</button> }
      { isPlayerReady && <button type="submit" className="btn-delete" onClick={notReadyAction}>
        <span>Not Ready!</span>
        <span className={`${styles.notReadyCross} material-symbols-outlined`}>close</span>
      </button> }
    </div>
  </>);
}
