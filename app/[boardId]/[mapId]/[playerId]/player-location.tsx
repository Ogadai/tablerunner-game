import { useEffect, useState } from "react";

import { LocationMove } from "@/lib/games/types";
import { PlayerAction, PlayerActionMove, PlayerActionsState, PlayerActionType, PlayerState } from "@/lib/store/types";
import { moveDescriptions } from './move-descriptions';
import styles from './player-location.module.css';
import { addPlayerAction, getPlayerActionsState, removePlayerAction } from "@/lib/store/playerActionsState";

export default function PlayerLocation(
  {
    boardId,
    mapId,
    playerState
  }: {
    boardId: string;
    mapId: string;
    playerState: PlayerState
  }) {
  const [actionsState, setActionsState] = useState<PlayerActionsState>({ actions: [] });

  useEffect(() => {
    async function fetchPlayerActionState() {
      const state = await getPlayerActionsState(boardId, mapId, playerState.id);
      setActionsState(state.data!);
    }
    fetchPlayerActionState();
  }, [playerState]);

  const getMoveName = (locationMove: LocationMove): string => {
    return moveDescriptions[locationMove.direction];
  }

  const bindMoveAction = (locationMove: LocationMove) =>
    async () => {
      const actionNumber = actionsState.actions.reduce((number, action) => 
        Math.max(number, action.id + 1), 0);

      const moveAction: PlayerActionMove = {
        id: actionNumber,
        type: PlayerActionType.Move,
        description: getMoveName(locationMove),
        direction: locationMove.direction
      };

      const state = await addPlayerAction(boardId, mapId, playerState.id, moveAction);
      setActionsState(state.data!);
    };

  const bindRemoveAction = (action: PlayerAction) => 
    async () => {
      const state = await removePlayerAction(boardId, mapId, playerState.id, action.id);
      setActionsState(state.data!);
    };

  return (<div>
    <div className={styles.playerHeader}>
      <h2>{playerState.name}</h2>
      <h4>Location {playerState.location.id}</h4>
    </div>
    <p>{playerState.location?.description}</p>
    
    <div className={styles.moveActionButtons}>
      {playerState.location.move.map(mv => 
        <button type="button" key={mv.direction}
          onClick={bindMoveAction(mv)}>{getMoveName(mv)}
        </button>
      )}
    </div>

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
  </div>);
}
