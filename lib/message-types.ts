import { LocationMoveDirection } from "./games/types";

export enum GameTopicMessageType {
  BleConnectedStatus = 'ble_connected',
  GameProcessingStarted = 'game_processing_started',
  GameStateUpdated = 'game_state_updated',
  ReadyStateUpdated = 'ready_state_updated',
  LocationUpdated = 'location_updated',
  VideoPreload = 'video_preload',
  VideoPlay = 'video_play',
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
  readyPlayerDirection?: { [id: string]: LocationMoveDirection };
}

export interface LocationUpdatedMessage extends GameTopicMessageBase {
  type: GameTopicMessageType.LocationUpdated;
  locationId: number;
}

export interface VideoPreloadMessage extends GameTopicMessageBase {
  type: GameTopicMessageType.VideoPreload;
  url: string;
}

export interface VideoPlayMessage extends GameTopicMessageBase {
  type: GameTopicMessageType.VideoPlay;
  url: string;
}
