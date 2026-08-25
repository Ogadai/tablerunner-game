export enum GameTopicMessageType {
  BleConnectedStatus = 'ble_connected',
}

export interface BleConnectedStatusMessage {
  connected: boolean;
  playerId?: string;
}
