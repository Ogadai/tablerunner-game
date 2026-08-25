
'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

import styles from './layout.module.css';
import BluetoothController from '../../ble/bluetooth-controller';
import { bluetoothService } from '../../ble/bluetooth-service';
import GameTopic from '../../message-bus/game-topic';
import { BleConnectedStatusMessage, getGameTopicId } from '../../../lib/message-types';

export default function RootLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const boardId = params.boardId?.toString() || '';
  const mapId = params.mapId?.toString() || '';
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [blePlayerId, setBlePlayerId] = useState<string | null>(null);
  const bleStatusCallback = useRef<((message: BleConnectedStatusMessage) => void) | null>(null);
  const currentBlePlayerId = useRef<string | null>(null);

  useEffect(() => {
    const initializePlayer = window.setTimeout(() => {
      let storedPlayerId = localStorage.getItem('player_guid') || '';
      if (!storedPlayerId) {
        storedPlayerId = crypto.randomUUID();
        localStorage.setItem('player_guid', storedPlayerId);
      }
      setPlayerId(storedPlayerId);
    }, 0);

    return () => window.clearTimeout(initializePlayer);
  }, []);

  useEffect(() => {
    return bluetoothService.subscribe(connected => {
      bleStatusCallback.current?.({
        connected: connected === 'connected',
        playerId: playerId || undefined,
      });
    });
  }, [playerId]);

  const onBleStatusReceived = (message: BleConnectedStatusMessage | null) => {
    if (message?.connected && message.playerId) {
      setBlePlayerId(message.playerId);
      currentBlePlayerId.current = message.playerId;
    } else if (message?.playerId === currentBlePlayerId.current || !message?.playerId) {
      setBlePlayerId(null);
      currentBlePlayerId.current = null;
    }
  };

  return (
    <div className={styles.page}>
      {playerId && (
        <div className={styles.header}>
          <BluetoothController
            bleOtherPlayer={!!blePlayerId && blePlayerId !== playerId}
          />
          <GameTopic
            topicId={getGameTopicId(boardId, mapId)}
            playerId={playerId}
            onSetBleStatusCallback={callback => {
              bleStatusCallback.current = callback;
            }}
            onBleStatusReceived={onBleStatusReceived}
          />
        </div>
      )}
      <div className={`${styles.content} page-content`}>
        {children}
      </div>
    </div>
  );
}
