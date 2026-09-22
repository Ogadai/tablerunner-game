import { GameTopicMessageType, VideoPreloadMessage, VideoPlayMessage } from '../message-types';
import { publishMessage } from './message-publisher';
import { videoList } from './video-list';

export async function publishPreloadVideo(boardId: string, mapId: string, videoName: string) {
  const message: VideoPreloadMessage = {
    type: GameTopicMessageType.VideoPreload,
    url: videoList[videoName],
  };
  await publishMessage(boardId, mapId, message);
}

export async function publishPlayVideo(boardId: string, mapId: string, videoName: string) {
  const message: VideoPlayMessage = {
    type: GameTopicMessageType.VideoPlay,
    url: videoList[videoName],
  };
  await publishMessage(boardId, mapId, message);
}
