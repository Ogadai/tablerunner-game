'use client'
import { useEffect, useState } from "react";
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import gameStateSyncService from "./game-state-sync-service";
import readyStateSyncService from "./ready-state-sync-service";
import PlayHeaderMenu from './play-header-menu';
import styles from './play-header.module.css';
import { PlayerState } from "@/lib/store/types";
import { getGameTopicId } from "@/lib/message-types";
import { getGameState } from "@/lib/store/gameState";
import { getPlayerReadyState } from "@/lib/store/playerReadyState";
import { GameState, PlayerReadyState } from "@/lib/store/types";
import GameTopicService from '../../../message-bus/game-topic-service';
import PlayerReadyTopicService from '../../../message-bus/playerReady-topic-service';
import PlayHeaderMessages from "./play-header-messages";

export default function PlayHeader(
  { boardId, mapId }
  : { boardId: string, mapId: string }
) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [readyState, setReadyState] = useState<PlayerReadyState>({ readyPlayerIds: [] });
  const router = useRouter();
  const params = useParams();
  const playerId = params.playerId?.toString() || '';
  const topicId = getGameTopicId(boardId, mapId);

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

  const getPlayerIcon = (characterId: string) =>
    gameState.characters.find(c => c.id === characterId)?.icon || '';

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
          {!!playerId && <li key="add">
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
                <Image
                  className={`${styles.playerIcon}`}
                  src={getPlayerIcon(player.id)}
                  width={53}
                  height={80}
                  loading="eager"
                  alt={player.name}
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
