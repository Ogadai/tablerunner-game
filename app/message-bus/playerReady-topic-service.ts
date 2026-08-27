import { PlayerReadyState } from '@/lib/store/types';
type PlayerReadyStateUpdatedListener = (readyState: PlayerReadyState) => void;

class PlayerReadyTopicService {
  private static readonly listeners = new Map<string, Set<PlayerReadyStateUpdatedListener>>();

  static subscribe(topicId: string, listener: PlayerReadyStateUpdatedListener): () => void {
    const topicListeners = this.listeners.get(topicId) ?? new Set<PlayerReadyStateUpdatedListener>();
    topicListeners.add(listener);
    this.listeners.set(topicId, topicListeners);

    return () => {
      topicListeners.delete(listener);
      if (topicListeners.size === 0) {
        this.listeners.delete(topicId);
      }
    };
  }

  static raisePlayerReadyStateUpdated(topicId: string, readyState: PlayerReadyState): void {
    this.listeners.get(topicId)?.forEach(listener => listener(readyState));
  }
}

export default PlayerReadyTopicService;
