import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import { getSwalDefaultOptions } from '@/app/swal';

import { moveDescriptions, moveLabels, moveLabelOrder } from './move-descriptions';
import styles from './player-location.module.css';
import { PlayerAction, PlayerActionMove, PlayerActionsState, PlayerActionType, LocationState, GameState, PlayerState, PlayerActionUseItem, PlayerLocationMove, getDisplayName } from "@/lib/store/types";
import { LocationMoveDirection } from "@/lib/games/types";
import { addPlayerAction, getPlayerActionsState, removePlayerAction } from "@/lib/store/playerActionsState";
import { getLocationState } from '@/lib/store/locationState';
import PlayerLocationList from './player-location-list';
import LocationTopicService from "@/app/message-bus/location-topic-service";
import { getGameTopicId } from "@/lib/message-types";
import PlayerSpells from './player-spells';
import PlayerStore from './player-store';
import PlayerPortal from './player-portal';
import { characters } from '@/lib/games/characters';
import { monsters } from '@/lib/games/monsters';
import { EntityItemClass, EntityItemDetail } from './entity-list';
import playerStatsSyncService, { PlayerStats, emptyPlayerStats } from "./player-stats-sync.service";
import FastTravel from './fast-travel';
import PlayerVideo from './player-video';

export default function PlayerLocation(
  {
    boardId,
    mapId,
    gameState,
    playerId,
    isPlayerReady,
    processing,
    readyPlayerDirection,
    endTurnAction,
  }: {
    boardId: string;
    mapId: string;
    gameState: GameState,
    playerId: string,
    isPlayerReady: boolean,
    processing: boolean,
    readyPlayerDirection?: { [id: string]: LocationMoveDirection },
    endTurnAction: (direction?: LocationMoveDirection) => void,
  }) {
  const [locationState, setLocationState] = useState<LocationState>({ monsters: [], items: [], npcs: [] });
  const [playerState, setPlayerState] = useState<PlayerState | null>();
  const [playerStats, setPlayerStats] = useState<PlayerStats>(emptyPlayerStats);
  const [actionsState, setActionsState] = useState<PlayerActionsState>({ actions: [] });
  const router = useRouter();

  const playerAlive = playerState && playerState.health > 0;
  const otherPlayers = gameState.players.filter(p => p.id !== playerId && p.location.id === playerState?.location.id);
  const npcs = locationState.npcs;
  const topicId = getGameTopicId(boardId, mapId);

  const usedItemIds = actionsState.actions
    .filter(a => a.type === PlayerActionType.UseItem)
    .map(a => (a as PlayerActionUseItem).itemId || '');
  let actionNumber = actionsState.actions.reduce((number, action) => 
    Math.max(number, action.id + 1), 0);

  useEffect(() => {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) {
      router.push(`/${boardId}/${mapId}`);
    } else {
      playerStatsSyncService.updatePlayer(boardId, mapId, player);
      setActionsState({ actions: [] });

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
          setActionsState(actionsState);
          setPlayerState(activePlayer);
        }),
      ];

      fetchLocationState();

      return () => disposeFns.forEach(f => f());
    }
  }, [gameState]);

  const addNewAction = async (opts: Omit<PlayerAction, 'id'>) => {
    const state = await addPlayerAction(boardId, mapId, playerState!.id, {
      ...opts,
      id: actionNumber++,
    });
    playerStatsSyncService.updateActionsState(state.data!);
  }

  const bindMoveAction = (locationMove: PlayerLocationMove) =>
    async () => {
      if (!canMoveDirection(locationMove)) {
        const blockDesc = locationMove.blockDescription
          || 'You cannot move through this location while there are enemies. You can only retreat.';
        await Swal.fire({
          ...getSwalDefaultOptions(),
          title: 'Movement blocked!',
          icon: 'warning',
          text: blockDesc,
        });
          
        return;
      }

      await addNewAction({
        type: PlayerActionType.Move,
        description: moveDescriptions[locationMove.direction],
        direction: locationMove.direction
      } as Omit<PlayerActionMove, 'id'>);

      endTurnAction(locationMove.direction);
    };
  
  const notReadyAction = async () => {
    const travelAction = actionsState.actions.find(
      a => a.type === PlayerActionType.Move || a.type === PlayerActionType.Portal
    );

    if (travelAction) {
      const state = await removePlayerAction(boardId, mapId, playerState!.id, travelAction.id);
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

  const respawnAction = async () => {
    await addNewAction({
      type: PlayerActionType.Respawn,
      description: 'Respawn',
    } as Omit<PlayerAction, 'id'>);

    endTurnAction();
  }

  const canMoveDirection = (locationMove: PlayerLocationMove): boolean =>
    !locationMove.blockDescription &&
    (!locationState.monsters.some(monster => monster.health > 0) || locationMove.direction === playerState.retreatDirection);

  const getOtherPlayerMoveIndicator = (direction: LocationMoveDirection): {
    className: string;
    style?: CSSProperties;
  } => {
    const movingPlayers = otherPlayers.filter(
      otherPlayer => readyPlayerDirection?.[otherPlayer.id] === direction
    );
    const className = movingPlayers.map(otherPlayer => styles[otherPlayer.id] || '').join(' ');

    if (movingPlayers.length < 2) {
      return { className };
    }

    const colors = movingPlayers.map(otherPlayer => `#${characters[otherPlayer.id].rgbColour}`);
    const style = {
      '--direction-indicator-color-1': colors[0],
      '--direction-indicator-color-2': colors[1],
      '--direction-indicator-color-3': colors[2],
    } as CSSProperties;

    return {
      className: `${className} ${styles[`direction-indicator-${movingPlayers.length}`]}`,
      style,
    };
  };
  const entities: EntityItemDetail[] = [
    {
      id: playerState.id,
      name: playerState.name,
      iconXY: characters[playerState.id].iconXY,
      className: EntityItemClass.self,
      health: playerState.health,
      maxHealth: playerState.baseStats?.health || playerState.health,
      levelUp: playerStats.health > 0 && playerStats.availablePoints > 0
    },
    ...otherPlayers.map(otherPlayer => ({
      id: otherPlayer.id,
      name: otherPlayer.name,
      iconXY: characters[otherPlayer.id].iconXY,
      className: EntityItemClass.friendly,
      health: otherPlayer.health,
      maxHealth: otherPlayer.baseStats?.health || otherPlayer.health
    })),
    ...npcs.map(npc => ({
      id: npc.id,
      name: npc.name,
      iconXY: npc.iconXY,
      className: npc.alignment === 'evil' ? EntityItemClass.enemy : EntityItemClass.npc,
      health: npc.health,
      maxHealth: npc.baseStats?.health || npc.health
    })),
    ...locationState.monsters.map(monster => ({
      id: monster.id,
      name: monsters[monster.type].name,
      iconXY: monsters[monster.type].iconXY,
      className: EntityItemClass.enemy,
      health: monster.health,
      maxHealth: monsters[monster.type].baseStats.health
    }))
  ];

  const hasPortalStone = gameState.portals?.includes(playerState.location.id);
  const hasLivingMonsters = locationState.monsters.some(monster => monster.health > 0);

  const locationOverride = gameState.locationOverrides
    && gameState.locationOverrides.find(l => l.id === playerState.location.id);
  const locationDescription = locationOverride
    ? locationOverride.description : playerState.location?.description;

  return (<>
    <div className={styles.playerLocationScreen}>
      <PlayerVideo topicId={topicId} turn={gameState.turn} />
      <div className={styles.playerHeader}>
        <h3>{getDisplayName(playerState)}</h3>
        <h4>Location {playerState.location.id}</h4>
      </div>
      <p>{locationDescription}</p>
      <PlayerLocationList
        boardId={boardId}
        mapId={mapId}
        player={playerState}
        otherPlayers={otherPlayers}
        monsters={locationState.monsters}
        npcs={npcs}
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
              disabled={processing}
            >delete_forever</button>
          </li>) }
        </ul>
      </div> }
    </div>

    { playerAlive && <div className={styles.actionButtonContainer}><div className={styles.actionButtonGroup1}>
      { (!isPlayerReady && playerStats.playerCanMove) && <div className={styles.moveActionButtons}>
        {playerState.location.move.sort((a1, a2) => moveLabelOrder[a1.direction] - moveLabelOrder[a2.direction]).map(mv => {
          const moveIndicator = getOtherPlayerMoveIndicator(mv.direction);
          return <button type="button" key={mv.direction}
            className={`${styles[`move-${mv.direction}`]} ${moveIndicator.className} ${canMoveDirection(mv) ? 'btn' : 'btn-secondary'} material-symbols-outlined`}
            style={moveIndicator.style}
            onClick={bindMoveAction(mv)}
            disabled={processing}
          >{moveLabels[mv.direction]}
          </button>;
        })}

        { (!isPlayerReady && playerStats.playerCanMove) &&
          <button className={styles.stay} type="submit" onClick={() => endTurnAction()}
            disabled={processing}
          >Stay</button> }
      </div> }

      { (!isPlayerReady && !playerStats.playerCanMove) &&
        <button
          className={`${styles.stay} ${actionsState.actions.length > 0 ? styles.readyWithActions : ''}`} 
          type="submit" onClick={() => endTurnAction()}
          disabled={processing}
        >Ready</button>
      }
      { isPlayerReady && !processing &&
        <button type="submit" className={`${styles.stay} btn-delete`} onClick={notReadyAction}>
          <span>Not Ready!</span>
          <span className={`${styles.notReadyCross} material-symbols-outlined`}>close</span>
        </button>
      }
    </div><div className={styles.actionButtonGroup2}>
      { playerStats &&
        <PlayerSpells
          playerSpells={playerState.spells}
          player={playerState}
          entities={entities}
          playerStats={playerStats}
          addNewAction={addNewAction}
        />
      }
      <div className={ styles.bottomRowButtons }>
        {
          <FastTravel
            boardId={boardId}
            mapId={mapId}
            player={playerState}
            gameState={gameState}
            playerCanMove={playerStats.playerCanMove}
            hasLivingEnemies={hasLivingMonsters}
            actionPointsLeft={playerStats.actionPointsTotal - playerStats.actionPointsUsed}
            moveCost={playerStats.actionsPerTurn.move}
            addNewAction={addNewAction}
            endTurnAction={endTurnAction}
          />
        }
        {
          gameState.stores.includes(playerState.location.id) &&
          <PlayerStore boardId={boardId} mapId={mapId} player={playerState} usedItemIds={usedItemIds} />
        }
        {
          hasPortalStone &&
          <PlayerPortal
            boardId={boardId}
            mapId={mapId}
            player={playerState}
            gameState={gameState}
            playerCanMove={playerStats.playerCanMove}
            hasLivingEnemies={hasLivingMonsters}
            actionPointsLeft={playerStats.actionPointsTotal - playerStats.actionPointsUsed}
            moveCost={playerStats.actionsPerTurn.move}
            addNewAction={addNewAction}
            endTurnAction={endTurnAction}
          />
        }
      </div>
    </div></div>}

    { !playerAlive && playerState.respawnTurns !== undefined &&
      <div className={styles.actionButtonContainer}>
        <button
          type="submit" onClick={() => respawnAction()}
          disabled={playerState.respawnTurns > 0 || actionsState.actions.length > 0}
        >Respawn</button>

        { (playerState.respawnTurns > 0) &&
          <span className={styles.respawnMessage}>
            in {playerState.respawnTurns} turn{playerState.respawnTurns > 0 ? 's' : ''}
          </span>
        }
      </div>
    }
  </>);
}
