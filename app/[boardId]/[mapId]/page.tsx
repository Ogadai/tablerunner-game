'use client'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react';

import styles from "./page.module.css";
import { ApiResponse } from "@/lib/api-response";
import { getGameState } from "@/lib/store/gameState";
import { GameState } from "@/lib/store/types";

import CreateGame from './create-game';
import PlayGame from './play-game';

import BluetoothController from "../../ble/ble-board";
import GameTopic from '@/app/message-bus/game-topic';
import ErrorComponent from '../../error';
import { BleConnectedStatusMessage } from '@/app/message-bus/message-types';

export default function Page() {
  const params = useParams();
  const boardId = params.boardId?.toString() || '';
  const mapId = params.mapId?.toString() || '';
  let bleStatusCallback: ((message: BleConnectedStatusMessage) => void) | null = null;

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<ApiResponse<GameState> | null>(null);
  const [blePlayerId, setBlePlayerId] = useState<string | null>(null);
  let currentBlePlayerId: string | null = null;

  useEffect(() => {
    let playerId: string = localStorage.getItem('player_guid') || '';
    if (!playerId) {
      playerId = crypto.randomUUID(); // Generates a standard RFC4122 UUID/GUID
      localStorage.setItem('player_guid', playerId);
    }
    setPlayerId(playerId);

    async function fetchGameState() {
      const state = await getGameState(boardId, mapId);
      setGameState(state);
    }

    fetchGameState();
  }, []);

  if (!gameState || !playerId) {
    return <p>Loading...</p>;
  }

  if (!gameState.success) {
    return <ErrorComponent error={new Error(gameState.error)} />;
  }

  const onCreateGame = (newGameState: GameState) => {
    setGameState({ success: true, data: newGameState });
  }

  const onDeleteGame = () => {
    setGameState({ success: true, data: undefined });
  }

  const onBleStatus = (connected: boolean) => {
    if (bleStatusCallback) {
      bleStatusCallback({
        connected,
        playerId
      });
    }
  }

  const onBleStatusReceived = (message: BleConnectedStatusMessage | null) => {
    if (message && message.playerId) {
      if (message.connected) {
        setBlePlayerId(message.playerId);
        currentBlePlayerId = message.playerId;
      } else if (message.playerId === currentBlePlayerId) {
        setBlePlayerId(null);
        currentBlePlayerId = null;
      }
    } else {
      setBlePlayerId(null);
      currentBlePlayerId = null;
    }
  }

  const onSetBleStatusCallback = (callback: (message: BleConnectedStatusMessage) => void) => {
    bleStatusCallback = callback;
  }

  const bleOtherPlayer = !!blePlayerId && blePlayerId !== playerId;

  return (<div><main>
    <div>
      <BluetoothController bleOtherPlayer={bleOtherPlayer} onBleStatus={onBleStatus} />
      <GameTopic
        topicId={`${boardId}-${mapId}`}
        playerId={playerId}
        onSetBleStatusCallback={onSetBleStatusCallback}
        onBleStatusReceived={m => onBleStatusReceived(m)}
      />
    </div>

    {gameState.data && <PlayGame boardId={boardId} mapId={mapId} name={gameState.data.name} onDeleteGame={onDeleteGame} />}
    {!gameState.data && <CreateGame boardId={boardId} mapId={mapId} onCreateGame={onCreateGame} />}
  </main></div>);
}
