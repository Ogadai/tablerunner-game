import { useEffect, useState } from "react";

import { LocationMove } from "@/lib/games/types";
import { PlayerAction, PlayerActionMove, PlayerActionsState, PlayerActionType, PlayerState } from "@/lib/store/types";
import { moveDescriptions, moveLabels, moveLabelOrder } from './move-descriptions';
import styles from './player-location.module.css';
import { addPlayerAction, getPlayerActionsState, removePlayerAction } from "@/lib/store/playerActionsState";

export default function PlayerLocation(
  {
    boardId,
    mapId,
    playerState,
    isPlayerReady,
    endTurnAction
  }: {
    boardId: string;
    mapId: string;
    playerState: PlayerState,
    isPlayerReady: boolean,
    endTurnAction: () => void
  }) {
  const [actionsState, setActionsState] = useState<PlayerActionsState>({ actions: [] });

  useEffect(() => {
    async function fetchPlayerActionState() {
      const state = await getPlayerActionsState(boardId, mapId, playerState.id);
      setActionsState(state.data!);
    }
    fetchPlayerActionState();
  }, [playerState]);

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

      const state = await addPlayerAction(boardId, mapId, playerState.id, moveAction);
      setActionsState(state.data!);

      endTurnAction();
    };

  const bindRemoveAction = (action: PlayerAction) => 
    async () => {
      const state = await removePlayerAction(boardId, mapId, playerState.id, action.id);
      setActionsState(state.data!);
    };

  return (<>
    <div className={styles.playerLocationScreen}>
      <div className={styles.playerHeader}>
        <h2>{playerState.name}</h2>
        <h4>Location {playerState.location.id}</h4>
      </div>
      <p>{playerState.location?.description}</p>
    
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
      { isPlayerReady && <button type="submit" className="btn-delete" onClick={endTurnAction}>
        <span>Not Ready!</span>
        <span className={`${styles.notReadyCross} material-symbols-outlined`}>close</span>
      </button> }
    </div>
  </>);
}
