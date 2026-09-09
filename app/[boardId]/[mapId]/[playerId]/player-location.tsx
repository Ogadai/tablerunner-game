import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import { getSwalDefaultOptions } from '@/app/swal';

import { LocationMove, LocationMoveDirection } from "@/lib/games/types";
import { moveDescriptions, moveLabels, moveLabelOrder } from './move-descriptions';
import styles from './player-location.module.css';
import { PlayerAction, PlayerActionMove, PlayerActionsState, PlayerActionType, LocationState, GameState, MonsterState, PlayerActionCast, PlayerState } from "@/lib/store/types";
import { addPlayerAction, getPlayerActionsState, removePlayerAction } from "@/lib/store/playerActionsState";
import { getLocationState } from '@/lib/store/locationState';
import PlayerLocationList from './player-location-list';
import LocationTopicService from "@/app/message-bus/location-topic-service";
import { getGameTopicId } from "@/lib/message-types";
import PlayerSpells from './player-spells';
import PlayerStore from './player-store';
import { characters } from '@/lib/games/characters';
import { monsters } from '@/lib/games/monsters';
import { EntityItemClass, EntityItemDetail } from './entity-list';
import playerStatsSyncService, { PlayerStats, emptyPlayerStats } from "./player-stats-sync.service";

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
  const [locationState, setLocationState] = useState<LocationState>({ monsters: [], items: [] });
  const [playerState, setPlayerState] = useState<PlayerState | null>();
  const [playerStats, setPlayerStats] = useState<PlayerStats>(emptyPlayerStats);
  const [actionsState, setActionsState] = useState<PlayerActionsState>({ actions: [] });
  const router = useRouter();

  const playerAlive = playerState && playerState.health > 0;
  const otherPlayers = gameState.players.filter(p => p.id !== playerId && p.location.id === playerState?.location.id);
  const topicId = getGameTopicId(boardId, mapId);

  useEffect(() => {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) {
      router.push(`/${boardId}/${mapId}`);
    } else {
      playerStatsSyncService.updatePlayer(boardId, mapId, player);

      async function fetchPlayerActionState() {
        const state = await getPlayerActionsState(boardId, mapId, player!.id);
      }

      async function fetchLocationState() {
        const state = await getLocationState(boardId, mapId, player!.location.id);
        setLocationState(state.data!);
      }

      const disposeFns = [
        LocationTopicService.subscribe(topicId, locationId => {
          if (locationId === player.location.id) {
            fetchLocationState();
          }
        }),
        playerStatsSyncService.subscribe((stats, actionsState, addStatsState, activePlayer) => {
          setPlayerStats(stats);
          setActionsState(actionsState)
          setPlayerState(activePlayer);
        }),
      ];

      fetchPlayerActionState();
      fetchLocationState();

      return () => disposeFns.forEach(f => f());
    }
  }, [gameState]);

  const addNewAction = async (opts: Omit<PlayerAction, 'id'>) => {
    const actionNumber = actionsState.actions.reduce((number, action) => 
      Math.max(number, action.id + 1), 0);

    const state = await addPlayerAction(boardId, mapId, playerState!.id, {
      ...opts,
      id: actionNumber,
    });
    playerStatsSyncService.updateActionsState(state.data!);
  }

  const bindMoveAction = (locationMove: LocationMove) =>
    async () => {
      if (!canMoveDirection(locationMove.direction)) {
        await Swal.fire({
          ...getSwalDefaultOptions(),
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
      playerStatsSyncService.updateActionsState(state.data!);
    }

    endTurnAction();
  }

  const bindRemoveAction = (action: PlayerAction) => 
    async () => {
      const state = await removePlayerAction(boardId, mapId, playerState!.id, action.id);
      playerStatsSyncService.updateActionsState(state.data!);
    };

  if (!playerState) {
    return <p>Loading...</p>;
  }

  const canMoveDirection = (direction: LocationMoveDirection): boolean =>
    !locationState.monsters.some(monster => monster.health > 0) || direction === playerState.retreatDirection;

  const entities: EntityItemDetail[] = [
    {
      id: playerState.id,
      name: playerState.name,
      icon: characters[playerState.id].icon,
      className: EntityItemClass.self,
      health: playerState.health,
      maxHealth: playerState.baseStats?.health || playerState.health,
      levelUp: playerStats.availablePoints > 0
    },
    ...otherPlayers.map(otherPlayer => ({
      id: otherPlayer.id,
      name: otherPlayer.name,
      icon: characters[otherPlayer.id].icon,
      className: EntityItemClass.friendly,
      health: otherPlayer.health,
      maxHealth: otherPlayer.baseStats?.health || otherPlayer.health
    })),
    ...locationState.monsters.map(monster => ({
      id: monster.id,
      name: monsters[monster.type].name,
      icon: monsters[monster.type].icon,
      className: EntityItemClass.enemy,
      health: monster.health,
      maxHealth: monsters[monster.type].baseStats.health
    }))
  ];

  return (<>
    <div className={styles.playerLocationScreen}>
      <div className={styles.playerHeader}>
        <h3>{playerState.name}</h3>
        <h4>Location {playerState.location.id}</h4>
      </div>
      <p>{playerState.location?.description}</p>
      <PlayerLocationList
        boardId={boardId}
        mapId={mapId}
        player={playerState}
        otherPlayers={otherPlayers}
        monsters={locationState.monsters}
        entities={entities}
        items={locationState.items}
        actionsState={actionsState}
        playerStats={playerStats}
        addNewAction={addNewAction}
      />
    
      { actionsState.actions.length > 0 && <div className={`${styles.actionsList}`}>
        <div className={styles.actionsHeader}>
          <h4>Actions</h4>
          <span>{playerStats.actionPointsUsed}/{playerStats.actionPointsTotal}</span>
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

    { playerAlive && <div className={styles.actionButtonContainer}><div className={styles.actionButtonGroup1}>
      { (!isPlayerReady && playerStats.playerCanMove) && <div className={styles.moveActionButtons}>
        {playerState.location.move.sort((a1, a2) => moveLabelOrder[a1.direction] - moveLabelOrder[a2.direction]).map(mv => 
          <button type="button" key={mv.direction}
            className={`${styles[`move-${mv.direction}`]} ${canMoveDirection(mv.direction) ? 'btn' : 'btn-secondary'} material-symbols-outlined`}
            onClick={bindMoveAction(mv)}
          >{moveLabels[mv.direction]}
          </button>
        )}

        { (!isPlayerReady && playerStats.playerCanMove) && <button className={styles.stay} type="submit" onClick={endTurnAction}>Stay</button> }
      </div> }

      { (!isPlayerReady && !playerStats.playerCanMove) &&
        <button
          className={`${styles.stay} ${actionsState.actions.length > 0 ? styles.readyWithActions : ''}`} 
          type="submit" onClick={endTurnAction}>Ready</button>
      }
      { isPlayerReady &&
        <button type="submit" className={`${styles.stay} btn-delete`} onClick={notReadyAction}>
          <span>Not Ready!</span>
          <span className={`${styles.notReadyCross} material-symbols-outlined`}>close</span>
        </button>
      }
    </div><div className={styles.actionButtonGroup2}>
      { playerStats && playerState.spells.length > 0 &&
        <PlayerSpells
          playerSpells={playerState.spells}
          player={playerState}
          entities={entities}
          playerStats={playerStats}
          addNewAction={addNewAction}
        />
      }
      {
        gameState.stores.includes(playerState.location.id) &&
        <PlayerStore boardId={boardId} mapId={mapId} player={playerState} />
      }
    </div></div>}
  </>);
}
