import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import { swalDefaultOptions } from '@/app/swal';

import { monsters } from '@/lib/games/monsters';
import { LocationMove, LocationMoveDirection } from "@/lib/games/types";
import { moveDescriptions, moveLabels, moveLabelOrder } from './move-descriptions';
import styles from './player-location.module.css';
import { PlayerAction, PlayerActionMove, PlayerActionAttack, PlayerActionsState, PlayerActionType, LocationState, GameState, MonsterState } from "@/lib/store/types";
import { addPlayerAction, getPlayerActionsState, removePlayerAction } from "@/lib/store/playerActionsState";
import { getLocationState } from '@/lib/store/locationState';
import PlayerLocationList from './player-location-list';
import { getPlayerActionsPerTurn, PlayerActionsPerTurn, getPlayerActionsCosts } from "@/lib/store/playerStats";

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
  const [actionsPerTurn, setActionsPerTurn] = useState<PlayerActionsPerTurn>({ total: 0, attack: 0, move: 0 });
  const router = useRouter();

  const playerState = gameState.players.find(p => p.id === playerId);
  const playerAlive = playerState && playerState.health > 0;
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
      setActionsPerTurn(getPlayerActionsPerTurn(playerState));
    }
  }, [gameState]);

  const addNewAction = async (opts: Omit<PlayerAction, 'id'>) => {
      const actionNumber = actionsState.actions.reduce((number, action) => 
        Math.max(number, action.id + 1), 0);

      const state = await addPlayerAction(boardId, mapId, playerState!.id, {
        ...opts,
        id: actionNumber,
      });
      setActionsState(state.data!);
  }

  const bindMoveAction = (locationMove: LocationMove) =>
    async () => {
      if (!canMoveDirection(locationMove.direction)) {
        await Swal.fire({
          ...swalDefaultOptions,
          title: 'Movement blocked!',
          icon: 'warning',
          text: "You cannot move through this location while there are enemies. You can only retreat.",
        });
          
        return;
      }

      await addNewAction({
        type: PlayerActionType.Move,
        description: moveDescriptions[locationMove.direction],
        direction: locationMove.direction
      } as Omit<PlayerActionMove, 'id'>);

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

  if (!playerState) {
    return <p>Loading...</p>;
  }

  const canMoveDirection = (direction: LocationMoveDirection): boolean =>
    locationState.monsters.length === 0 || direction === playerState.retreatDirection;

  const actionPointsUsed = getPlayerActionsCosts(playerState, actionsState);
  const actionPointsLeft = actionsPerTurn.total - actionPointsUsed;

  const isAttacking = actionsState.actions.some(a => a.type === PlayerActionType.Attack);
  const playerCanMove = playerAlive && !isAttacking &&  actionPointsLeft >= actionsPerTurn.move;

  return (<>
    <div className={styles.playerLocationScreen}>
      <div className={styles.playerHeader}>
        <h2>{playerState.name}</h2>
        <h4>Location {playerState.location.id}</h4>
      </div>
      <p>{playerState.location?.description}</p>
      <PlayerLocationList
        boardId={boardId}
        mapId={mapId}
        player={playerState}
        otherPlayers={otherPlayers}
        monsters={locationState.monsters}
        actionsState={actionsState}
        actionsPerTurn={actionsPerTurn}
        actionPointsLeft={actionPointsLeft}
        addNewAction={addNewAction}
      />
    
      { actionsState.actions.length > 0 && <div className={`${styles.actionsList}`}>
        <div className={styles.actionsHeader}>
          <h4>Actions</h4>
          <span>{actionPointsUsed}/{actionsPerTurn.total}</span>
        </div>
        <ul>
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

    { playerAlive && <>
      <div className={styles.moveActionButtons}>
        {(!isPlayerReady && playerCanMove) && playerState.location.move.sort((a1, a2) => moveLabelOrder[a1.direction] - moveLabelOrder[a2.direction]).map(mv => 
          <button type="button" key={mv.direction}
            className={`${canMoveDirection(mv.direction) ? 'btn' : 'btn-secondary'} material-symbols-outlined`}
            onClick={bindMoveAction(mv)}
          >{moveLabels[mv.direction]}
          </button>
        )}

        { (!isPlayerReady && playerCanMove) && <button type="submit" onClick={endTurnAction}>Stay</button> }
        { (!isPlayerReady && !playerCanMove) && <button type="submit" onClick={endTurnAction}>Ready</button> }
        { isPlayerReady && <button type="submit" className="btn-delete" onClick={notReadyAction}>
          <span>Not Ready!</span>
          <span className={`${styles.notReadyCross} material-symbols-outlined`}>close</span>
        </button> }
      </div>
    </>}
  </>);
}
