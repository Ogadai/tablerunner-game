'use client'
import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from 'next/navigation';
import gameStateSyncService from "./game-state-sync-service";
import readyStateSyncService from "./ready-state-sync-service";
import PlayHeaderMenu from './play-header-menu';
import styles from './play-header.module.css';
import { PlayerState } from "@/lib/store/types";
import { getGameTopicId } from "@/lib/message-types";
import { getGameState } from "@/lib/store/gameState";
import { getPlayerReadyState } from "@/lib/store/playerReadyState";
import { setPlayerReady } from "@/lib/store/playerReadyState";
import { GameState, PlayerReadyState } from "@/lib/store/types";
import GameTopicService from '../../../message-bus/game-topic-service';
import PlayerReadyTopicService from '../../../message-bus/playerReady-topic-service';
import PlayHeaderMessages from "./play-header-messages";

export default function PlayHeader(
  { boardId, mapId, onReadyCountdownChange }
  : { boardId: string, mapId: string, onReadyCountdownChange?: (countdown: number | null) => void }
) {
  const [gameState, setGameState] = useState<GameState | null>(null);
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
      readyCountdownRef.current = 10;
      setReadyCountdown(10);
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
    async function fetchGameState() {
      const state = await getGameState(boardId, mapId);
      setGameState(state?.data || null);
      gameStateSyncService.set(boardId, mapId, state.success ? state.data : undefined);
    }
    fetchGameState();

    async function fetchReadyState() {
      const state = await getPlayerReadyState(boardId, mapId);
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
      disposeGameSub();
      disposeReadySub();
    }
  }, [boardId, mapId, topicId]);

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
        <PlayHeaderMessages boardId={boardId} mapId={mapId} playerId={playerId} gameState={gameState} />
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
              </button>
            </li>
          ))}
        </ul>
      </div>
      <PlayHeaderMenu boardId={boardId} mapId={mapId} />
    </div>
  );
}
