import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import { getSwalDefaultOptions } from '@/app/swal';

import { moveDescriptions, moveLabels, moveLabelOrder } from './move-descriptions';
import styles from './player-location.module.css';
import { PlayerAction, PlayerActionMove, PlayerActionsState, PlayerActionType, LocationState, GameState, PlayerState, PlayerSnapshot, PlayerActionUseItem, PlayerLocationMove, getDisplayName } from "@/lib/store/types";
import { LocationMoveDirection } from "@/lib/games/types";
import { addPlayerAction, removePlayerAction } from "@/lib/store/playerActionsState";
import { getLocationState } from '@/lib/store/locationState';
import PlayerLocationList from './player-location-list';
import LocationTopicService from "@/app/message-bus/location-topic-service";
import StoreTopicService from "@/app/message-bus/store-topic-service";
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
import { getEnemies, isEnemy } from '@/lib/runner/game-friends-or-enemies';
import { getCombatStats, getPlayerActionsCosts, getPlayerActionsMagic } from '@/lib/store/playerStats';
import WarlordRecruitment from './warlords-of-fire/warlord-recruitment';

export default function PlayerLocation(
  {
    boardId,
    mapId,
    gameState,
    snapshot,
    playerId,
    isPlayerReady,
    processing,
    readyPlayerDirection,
    endTurnAction,
  }: {
    boardId: string;
    mapId: string;
    gameState: GameState,
    snapshot?: PlayerSnapshot,
    playerId: string,
    isPlayerReady: boolean,
    processing: boolean,
    readyPlayerDirection?: { [id: string]: LocationMoveDirection },
    endTurnAction: (direction?: LocationMoveDirection, ready?: boolean) => void,
  }) {
  const [locationUpdate, setLocationUpdate] = useState<{ snapshot: PlayerSnapshot; state: LocationState } | null>(null);
  const locationState = locationUpdate && locationUpdate.snapshot === snapshot
    ? locationUpdate.state : snapshot?.location || { monsters: [], items: [], npcs: [] };
  const [playerState, setPlayerState] = useState<PlayerState | null>();
  const [playerStats, setPlayerStats] = useState<PlayerStats>(emptyPlayerStats);
  const combatActionPending = useRef(false);
  const nextActionNumber = useRef(0);
  const currentPlayerInputs = useRef<{
    player: PlayerState;
    stats: PlayerStats;
    actions: PlayerActionsState;
  } | null>(null);
  const [actionsSnapshot, setActionsSnapshot] = useState<{ gameState: GameState; state: PlayerActionsState } | null>(null);
  const actionsState = actionsSnapshot?.gameState === gameState ? actionsSnapshot.state : { actions: [] };
  const router = useRouter();

  const playerAlive = playerState && playerState.health > 0;
  const otherPlayers = gameState.players.filter(p => p.id !== playerId && p.location.id === playerState?.location.id);
  const npcs = locationState.npcs;
  const topicId = getGameTopicId(boardId, mapId);

  const usedItemIds = actionsState.actions
    .filter(a => a.type === PlayerActionType.UseItem)
    .map(a => (a as PlayerActionUseItem).itemId || '');

  useEffect(() => {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) {
      router.push(`/${boardId}/${mapId}`);
    } else if (snapshot) {
      playerStatsSyncService.updatePlayer(player, snapshot);
      let disposed = false;
      let requestId = 0;

      async function fetchLocationState() {
        const currentRequest = ++requestId;
        const state = await getLocationState(boardId, mapId, player!.location.id);
        if (!disposed && currentRequest === requestId && state.success && state.data) {
          setLocationUpdate({ snapshot: snapshot!, state: state.data });
        }
      }

      const disposeFns = [
        StoreTopicService.subscribe(topicId, message => {
          if (message.playerId === playerId) {
            playerStatsSyncService.updateInventory(message.playerInventory);
          }
        }),
        LocationTopicService.subscribe(topicId, locationId => {
          if (locationId === player.location.id) {
            fetchLocationState();
          }
        }),
        playerStatsSyncService.subscribe((stats, actionsState, addStatsState, activePlayer) => {
          currentPlayerInputs.current = activePlayer ? { player: activePlayer, stats, actions: actionsState } : null;
          nextActionNumber.current = actionsState.actions.reduce((number, action) => Math.max(number, action.id + 1), 0);
          setPlayerStats(stats);
          setActionsSnapshot({ gameState, state: actionsState });
          setPlayerState(activePlayer);
        }),
      ];

      return () => {
        disposed = true;
        disposeFns.forEach(f => f());
      };
    }
  }, [gameState, snapshot, boardId, mapId, playerId, router, topicId]);

  const addNewAction = async (opts: Omit<PlayerAction, 'id'>) => {
    const isCombatAction = opts.type === PlayerActionType.Attack || opts.type === PlayerActionType.Cast;
    if (isCombatAction && combatActionPending.current) return;
    const inputs = currentPlayerInputs.current;
    if (!inputs) return;
    const nextActionId = inputs.actions.actions.reduce((number, action) => Math.max(number, action.id + 1), nextActionNumber.current);
    const action = { ...opts, id: nextActionId } as PlayerAction;
    if (isCombatAction) {
      const effectivePlayer = { ...inputs.player, baseStats: inputs.stats.baseStats };
      const nextActions = { actions: [...inputs.actions.actions, action] };
      const overActionBudget = getPlayerActionsCosts(effectivePlayer, nextActions) > inputs.stats.actionPointsTotal;
      const overMagicBudget = getPlayerActionsMagic(effectivePlayer, nextActions) > inputs.stats.magic;
      if (overActionBudget || overMagicBudget) {
        await Swal.fire({
          ...getSwalDefaultOptions(),
          title: 'Action blocked!',
          icon: 'warning',
          text: overActionBudget ? 'Not enough Action Points left this turn.' : 'Not enough magic left this turn.',
        });
        return;
      }
      // Reserve submission synchronously, before React renders or the request finishes.
      combatActionPending.current = true;
    }
    nextActionNumber.current = nextActionId + 1;
    try {
      const state = await addPlayerAction(boardId, mapId, inputs.player.id, action);
      if (!state.success || !state.data) throw new Error(state.error || 'Unable to save action.');
      // Keep the next click accurate even before the subscription triggers a render.
      if (currentPlayerInputs.current === inputs) {
        currentPlayerInputs.current = { ...inputs, actions: state.data };
      }
      playerStatsSyncService.updateActionsState(state.data);
    } catch (error) {
      await Swal.fire({
        ...getSwalDefaultOptions(),
        title: 'Action blocked!',
        icon: 'warning',
        text: (error as Error).message,
      });
    } finally {
      if (isCombatAction) combatActionPending.current = false;
    }
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
      a => a.type === PlayerActionType.Move
        || a.type === PlayerActionType.Portal
        || a.type === PlayerActionType.FastTravel
    );

    if (travelAction) {
      const state = await removePlayerAction(boardId, mapId, playerState!.id, travelAction.id);
      playerStatsSyncService.updateActionsState(state.data!);
    }

    endTurnAction(undefined, false);
  }

  const bindRemoveAction = (action: PlayerAction) => 
    async () => {
      const state = await removePlayerAction(boardId, mapId, playerState!.id, action.id);
      playerStatsSyncService.updateActionsState(state.data!);
    };

  if (!snapshot || !playerState) {
    return <p>Loading...</p>;
  }

  const respawnAction = async () => {
    await addNewAction({
      type: PlayerActionType.Respawn,
      description: 'Respawn',
    } as Omit<PlayerAction, 'id'>);

    endTurnAction();
  }

  const hasLivingEnemies = getEnemies({ gameState: { players: otherPlayers, npcs }, monsters: locationState.monsters }, playerState)
    .some(target => target.health > 0);

  const canMoveDirection = (locationMove: PlayerLocationMove): boolean =>
    !locationMove.blockDescription &&
    (!hasLivingEnemies || locationMove.direction === playerState.retreatDirection);

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
      className: isEnemy(playerState, otherPlayer) ? EntityItemClass.enemy : EntityItemClass.friendly,
      health: otherPlayer.health,
      maxHealth: otherPlayer.baseStats?.health || otherPlayer.health
    })),
    ...npcs.map(npc => ({
      id: npc.id,
      name: npc.name,
      iconXY: npc.iconXY,
      className: isEnemy(playerState, npc) ? EntityItemClass.enemy : EntityItemClass.npc,
      health: npc.health,
      maxHealth: npc.baseStats ? getCombatStats(npc).health : npc.health
    })),
    ...locationState.monsters.map(monster => ({
      id: monster.id,
      name: monsters[monster.type].name,
      iconXY: monsters[monster.type].iconXY,
      className: isEnemy(playerState, monster) ? EntityItemClass.enemy : EntityItemClass.npc,
      health: monster.health,
      maxHealth: monsters[monster.type].baseStats.health
    }))
  ];

  const hasPortalStone = gameState.portals?.includes(playerState.location.id);

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
    
      { gameState.gameId === 'warlordsfire' && <WarlordRecruitment
        key={`${boardId}/${mapId}/${playerId}`}
        boardId={boardId}
        mapId={mapId}
        playerId={playerId}
        gameState={gameState}
        availableCoins={playerState.coins}
        processing={processing}
      /> }

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
            hasLivingEnemies={hasLivingEnemies}
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
            hasLivingEnemies={hasLivingEnemies}
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
