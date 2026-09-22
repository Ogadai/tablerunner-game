import { VideoPlayMessage, VideoPreloadMessage } from '@/lib/message-types';

export type VideoTopicMessage = VideoPreloadMessage | VideoPlayMessage;
type VideoTopicMessageListener = (message: VideoTopicMessage) => void;

class VideoTopicService {
  private static readonly listeners = new Map<string, Set<VideoTopicMessageListener>>();

  static subscribe(topicId: string, listener: VideoTopicMessageListener): () => void {
    const topicListeners = this.listeners.get(topicId) ?? new Set<VideoTopicMessageListener>();
    topicListeners.add(listener);
    this.listeners.set(topicId, topicListeners);

    return () => {
      topicListeners.delete(listener);
      if (topicListeners.size === 0) {
        this.listeners.delete(topicId);
      }
    };
  }

  static raiseVideoMessage(topicId: string, message: VideoTopicMessage): void {
    this.listeners.get(topicId)?.forEach(listener => listener(message));
  }
}

export default VideoTopicService;