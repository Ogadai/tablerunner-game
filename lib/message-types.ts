export enum GameTopicMessageType {
  BleConnectedStatus = 'ble_connected',
  GameStateUpdated = 'game_state_updated',
  ReadyStateUpdated = 'ready_state_updated',
  LocationUpdated = 'location_updated',
}

export const getGameTopicId = (boardId: string, mapId: string): string => `${boardId}-${mapId}`;

export interface BleConnectedStatusMessage {
  connected: boolean;
  playerId?: string;
}

export interface GameTopicMessageBase {
  type: GameTopicMessageType;
}

export interface GameStateUpdatedMessage extends GameTopicMessageBase {
  type: GameTopicMessageType.GameStateUpdated;
}

export interface ReadyStateUpdatedMessage extends GameTopicMessageBase {
  type: GameTopicMessageType.ReadyStateUpdated;
  readyPlayerIds: string[];
}

export interface LocationUpdatedMessage extends GameTopicMessageBase {
  type: GameTopicMessageType.LocationUpdated;
  locationId: number;
}
