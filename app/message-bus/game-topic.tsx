'use client';

import { useEffect, useState } from 'react';
import * as Ably from 'ably';
import { BleConnectedStatusMessage, GameTopicMessageType } from '../../lib/message-types';
import GameTopicService from './game-topic-service';
import styles from './game-topic.module.css';

let _ably: Ably.Realtime | null = null;
function connectToAbly(playerId: string): Ably.Realtime {
  if (!_ably) {
    _ably = new Ably.Realtime({
      authCallback: async (tokenParams, callback) => {
        try {
          const response = await fetch('/api/ably-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId }),
          });
          const tokenRequest = await response.json();
          callback(null, tokenRequest); // Pass token request directly to Ably
        } catch (err: any) {
          callback(err, null);
        }
      },
      transportParams: {
        // Defines how long (in milliseconds) Ably keeps a user in the 
        // presence room after an abrupt WebSocket drop. (Minimum: 1000)
        remainPresentFor: "5000", 
        
        // Optional: Speed up how often the client checks connection health
        heartbeatInterval: "5000" 
      }
    });
  }
  return _ably as Ably.Realtime;
}

export default function GameTopic({
  topicId,
  playerId,
  onBleStatusReceived = () => {},
  onSetBleStatusCallback = () => {},
}: {
  topicId: string;
  playerId: string;
  onBleStatusReceived?: (message: BleConnectedStatusMessage | null) => void;
  onSetBleStatusCallback?: (callback: (message: BleConnectedStatusMessage) => void) => void;
}) {
  const [activeUsers, setActiveUsers] = useState<any[]>([]);

  useEffect(() => {
    // Instantiate Ably pointing to your POST auth endpoint
    const ably = connectToAbly(playerId);
    const channel = ably.channels.get(`game:${topicId}`);

    // Enter the presence room using the GUID
    channel.presence.enter({ name: `Player-${playerId.substring(0, 5)}` });

    // Listen for enter/leave
    channel.presence.subscribe(['enter', 'leave'], async () => {
      const members = await channel.presence.get();

      const connectedMember = members
        .map(m => m.data as BleConnectedStatusMessage)
        .find(m => m.connected);

      setActiveUsers(members || []);

      if (connectedMember) {
        onBleStatusReceived(connectedMember);
      } else {
        onBleStatusReceived({ connected: false });
      }
    });

    // Listen for update
    channel.presence.subscribe(['update'], (message) => {
      onBleStatusReceived(message.data);
    });

    channel.subscribe(message => {
      if (message.name === GameTopicMessageType.GameStateUpdated) {
        GameTopicService.raiseGameStateUpdated(topicId);
      }
    });

    onSetBleStatusCallback((message: BleConnectedStatusMessage) => {
      if (message) {
        channel.presence.update(message);
      }
    });

    return () => {
      channel.presence.unsubscribe();
      if (channel.state !== 'detached' && channel.state !== 'failed') {
        // Ignore errors if it's already mid-teardown
        channel.presence.leave().catch(() => {});
      }
      channel.unsubscribe();
    };
  }, [topicId]);

  return (<div className={styles.playerContainer}>
    <span className={styles.playerCount}>{activeUsers.length}</span>
  </div>);
}
