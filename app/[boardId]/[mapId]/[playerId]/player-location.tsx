import { LocationMove } from "@/lib/games/types";
import { PlayerState } from "@/lib/store/types";
import { moveDescriptions } from './move-descriptions';
import styles from './player-location.module.css';

const getMoveName = (locationMove: LocationMove): string => {
  if (locationMove.description) {
    return locationMove.description;
  }

  return moveDescriptions[locationMove.direction];
}

const bindMoveaction = (locationMove: LocationMove) =>
    async () => {

    }

export default function PlayerLocation({ playerState }: { playerState: PlayerState }) {
  return (<div>
    <h3>{playerState.name}</h3>
    <p>{playerState.location?.description}</p>
    <div className={styles.moveActionButtons}>
      {playerState.location.move.map(mv => 
        <button type="button" onClick={bindMoveaction(mv)}>{getMoveName(mv)}</button>
      )}
    </div>
  </div>);
}
