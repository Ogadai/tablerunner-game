import type { StoreUpdatedMessage } from '@/lib/message-types';

type StoreUpdatedListener = (message: StoreUpdatedMessage) => void;

class StoreTopicService {
  private static readonly listeners = new Map<string, Set<StoreUpdatedListener>>();

  static subscribe(topicId: string, listener: StoreUpdatedListener): () => void {
    const topicListeners = this.listeners.get(topicId) ?? new Set<StoreUpdatedListener>();
    topicListeners.add(listener);
    this.listeners.set(topicId, topicListeners);

    return () => {
      topicListeners.delete(listener);
      if (topicListeners.size === 0) {
        this.listeners.delete(topicId);
      }
    };
  }

  static raiseStoreUpdated(topicId: string, message: StoreUpdatedMessage): void {
    this.listeners.get(topicId)?.forEach(listener => listener(message));
  }
}

export default StoreTopicService;
