import { useEffect, useState } from "react";

import { LocationMove } from "@/lib/games/types";
import { PlayerActionMove, PlayerActionsState, PlayerActionType, PlayerState } from "@/lib/store/types";
import { moveDescriptions } from './move-descriptions';
import styles from './player-location.module.css';
import { addPlayerAction, getPlayerActionsState } from "@/lib/store/playerActionsState";

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
    async function fetchGameState() {
      const state = await getPlayerActionsState(boardId, mapId, playerState.id);
      setActionsState(state.data!);
    }
    fetchGameState();
  }, [playerState]);

  const getMoveName = (locationMove: LocationMove): string => {
    if (locationMove.description) {
      return locationMove.description;
    }

    return moveDescriptions[locationMove.direction];
  }

  const bindMoveaction = (locationMove: LocationMove) =>
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

  return (<div>
    <div className={styles.playerHeader}>
      <h2>{playerState.name}</h2>
      <h4>Location {playerState.location.id}</h4>
    </div>
    <p>{playerState.location?.description}</p>
    
    <div className={styles.moveActionButtons}>
      {playerState.location.move.map(mv => 
        <button type="button" key={mv.direction}
          onClick={bindMoveaction(mv)}>{getMoveName(mv)}
        </button>
      )}
    </div>

    <ul className={styles.actionsList}>
      { actionsState.actions.map(action => <li key={action.id}>
        { action.description }
      </li>) }
    </ul>
  </div>);
}
