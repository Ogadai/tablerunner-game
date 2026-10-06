'use client'
import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from 'next/navigation';
import gameStateSyncService from "./game-state-sync-service";
import readyStateSyncService from "./ready-state-sync-service";
import PlayHeaderMenu from './play-header-menu';
import styles from './play-header.module.css';
import { PlayerSnapshot, PlayerState } from "@/lib/store/types";
import { getGameTopicId } from "@/lib/message-types";
import { getGameState } from "@/lib/store/gameState";
import { getPlayerReadyState } from "@/lib/store/playerReadyState";
import { setPlayerReady } from "@/lib/store/playerReadyState";
import { GameState, PlayerReadyState } from "@/lib/store/types";
import GameTopicService from '../../../message-bus/game-topic-service';
import PlayerReadyTopicService from '../../../message-bus/playerReady-topic-service';
import PlayHeaderMessages from "./play-header-messages";
import { fetchPlayerSnapshot } from './player-snapshot';

export default function PlayHeader(
  { boardId, mapId, onReadyCountdownChange }
  : { boardId: string, mapId: string, onReadyCountdownChange?: (countdown: number | null) => void }
) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerSnapshot, setPlayerSnapshot] = useState<PlayerSnapshot | null>(null);
  const [readyState, setReadyState] = useState<PlayerReadyState>({ readyPlayerIds: [] });
  const [readyCountdown, setReadyCountdown] = useState<number | null>(null);
  const readyCountdownRef = useRef<number | null>(null);
  const router = useRouter();
  const params = useParams();
  const playerId = params.playerId?.toString() || '';
  const topicId = getGameTopicId(boardId, mapId);

  useEffect(() => {
    const players = gameState?.players || [];
    const unreadyPlayers = players.filter(player => !readyState.readyPlayerIds.includes(player.id));
    const lastUnreadyPlayer = unreadyPlayers.length === 1 ? unreadyPlayers[0] : undefined;

    if (players.length < 2 || lastUnreadyPlayer?.id !== playerId) {
      const resetTimer = window.setTimeout(() => setReadyCountdown(null), 0);
      return () => window.clearTimeout(resetTimer);
    }

    const startTimer = window.setTimeout(() => {
      readyCountdownRef.current = 15;
      setReadyCountdown(15);
    }, 0);
    const countdownTimer = window.setInterval(() => {
      const countdown = readyCountdownRef.current;

      if (countdown === null) {
        return;
      }

      if (countdown <= 1) {
        window.clearInterval(countdownTimer);
        readyCountdownRef.current = null;
        setReadyCountdown(null);
        void setPlayerReady(boardId, mapId, playerId, true);
        return;
      }

      const nextCountdown = countdown - 1;
      readyCountdownRef.current = nextCountdown;
      setReadyCountdown(nextCountdown);
    }, 1000);

    return () => {
      window.clearTimeout(startTimer);
      window.clearInterval(countdownTimer);
      readyCountdownRef.current = null;
    };
  }, [boardId, gameState, mapId, playerId, readyState]);

  useEffect(() => {
    onReadyCountdownChange?.(readyCountdown);
  }, [onReadyCountdownChange, readyCountdown]);

  useEffect(() => {
    const controller = new AbortController();
    let requestId = 0;

    async function triggerProcessing() {
      if (controller.signal.aborted) {
        return;
      }
      try {
        const response = await fetch('/api/processing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ boardId, mapId }),
          signal: controller.signal,
        });
        if (controller.signal.aborted) {
          return;
        }
        // Every client calls this; a lock conflict means another request won.
        if (!response.ok && response.status !== 423) {
          console.error('Between-turn processing failed:', response.status);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Unable to request between-turn processing', error);
        }
      }
    }

    async function fetchGameState() {
      const currentRequest = ++requestId;
      try {
        if (playerId) {
          const snapshot = await fetchPlayerSnapshot(boardId, mapId, playerId, controller.signal);
          if (controller.signal.aborted || currentRequest !== requestId) return;
          setPlayerSnapshot(snapshot);
          setGameState(snapshot.gameState);
          gameStateSyncService.set(boardId, mapId, snapshot.gameState || undefined, snapshot);
        } else {
          const state = await getGameState(boardId, mapId);
          if (controller.signal.aborted || currentRequest !== requestId) return;
          setPlayerSnapshot(null);
          setGameState(state.data || null);
          gameStateSyncService.set(boardId, mapId, state.success ? state.data : undefined);
        }
        void triggerProcessing();
      } catch (error) {
        if (!controller.signal.aborted && currentRequest === requestId) {
          console.error('Unable to refresh game state', error);
        }
      }
    }
    fetchGameState();

    async function fetchReadyState() {
      const state = await getPlayerReadyState(boardId, mapId);
      if (controller.signal.aborted) return;
      setReadyState(state.data!);
      readyStateSyncService.set(boardId, mapId, state.data!);
    }
    fetchReadyState();

    const disposeGameSub = GameTopicService.subscribe(topicId, fetchGameState);
    const disposeReadySub = PlayerReadyTopicService.subscribe(topicId, state => {
      setReadyState(state);
      readyStateSyncService.set(boardId, mapId, state);
    });

    return () => {
      controller.abort();
      disposeGameSub();
      disposeReadySub();
    }
  }, [boardId, mapId, playerId, topicId]);

  if (!gameState) {
    return <div className={styles.headerContainer}>
      <h3>TableRunner</h3>
    </div>;
  }

  const getPlayerIconStyle = (characterId: string) => {
    const character = gameState.characters.find(c => c.id === characterId)!;
    return {
      backgroundPosition: `-${character.iconXY.x * 25}px -${character.iconXY.y * 40}px`,
    }
  }

  const getPlayerClassName = (player: PlayerState) => {
    let className = styles.playerButton;
    
    if (playerId === player.id) {
      className = `${styles.currentPlayerItem} ${className}`;
    }

    return className;
  }

  const isPlayerReady = (player: PlayerState): boolean => {
    return readyState.readyPlayerIds.includes(player.id);
  }

  const bindPlayAsCharacterAction = (player: PlayerState) => 
    async () => {
      router.push(`/${boardId}/${mapId}/${player.id}`);
    };
  
  const navigateToNewPlayer = () => {
    router.push(`/${boardId}/${mapId}`);
  }
  
  return (
    <div className={styles.headerContainerGame}>
      { (gameState && playerId.length > 0) &&
        <PlayHeaderMessages key={`${boardId}:${mapId}:${playerId}`} playerMessages={
          playerSnapshot?.playerId === playerId ? playerSnapshot.messages : undefined
        } />
      }
      <div className={styles.headerContent}>
        <ul className={styles.playerList}>
          {!!playerId && (gameState.players.length < 4) && <li key="add">
            <button type="button"
              className="material-symbols-outlined"
              onClick={navigateToNewPlayer}
            >add</button>
          </li>}

          {gameState.players?.map((player) => (
            <li key={player.id}>
              <button type="button" className={getPlayerClassName(player)}
                onClick={bindPlayAsCharacterAction(player)}
              >
                <span className={styles.playerIcon}
                  style={getPlayerIconStyle(player.id)}
                />

                { isPlayerReady(player) &&
                  <span className={ `${styles.playerReady} material-symbols-outlined` }>check</span>
                }

                { player.health <= 0 &&
                  <div className={`${styles.playerDead} material-symbols-outlined`}>skull</div>
                }
              </button>
            </li>
          ))}
        </ul>
      </div>
      <PlayHeaderMenu
        key={`menu:${boardId}:${mapId}:${playerId}`}
        boardId={boardId}
        mapId={mapId}
        gameState={gameState}
        snapshot={playerSnapshot?.playerId === playerId && playerSnapshot.gameState === gameState
          ? playerSnapshot : undefined}
        onSnapshotChange={snapshot => {
          setPlayerSnapshot(snapshot);
          gameStateSyncService.set(boardId, mapId, snapshot.gameState || undefined, snapshot);
        }}
      />
    </div>
  );
}
