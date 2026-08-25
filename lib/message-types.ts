export enum GameTopicMessageType {
  BleConnectedStatus = 'ble_connected',
  GameStateUpdated = 'game_state_updated',
}

export const getGameTopicId = (boardId: string, mapId: string): string => `${boardId}-${mapId}`;

export interface BleConnectedStatusMessage {
  connected: boolean;
  playerId?: string;
}

export interface GameStateUpdatedMessage {
  type: GameTopicMessageType.GameStateUpdated;
}
