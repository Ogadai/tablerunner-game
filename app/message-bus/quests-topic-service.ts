import type { QuestsUpdatedMessage } from '@/lib/message-types';

type QuestsUpdatedListener = (message: QuestsUpdatedMessage) => void;

class QuestsTopicService {
  private static readonly listeners = new Map<string, Set<QuestsUpdatedListener>>();

  static subscribe(topicId: string, listener: QuestsUpdatedListener): () => void {
    const topicListeners = this.listeners.get(topicId) ?? new Set<QuestsUpdatedListener>();
    topicListeners.add(listener);
    this.listeners.set(topicId, topicListeners);

    return () => {
      topicListeners.delete(listener);
      if (topicListeners.size === 0) {
        this.listeners.delete(topicId);
      }
    };
  }

  static raiseQuestsUpdated(topicId: string, message: QuestsUpdatedMessage): void {
    if (!message || !Array.isArray(message.quests)) return;
    this.listeners.get(topicId)?.forEach(listener => listener(message));
  }
}

export default QuestsTopicService;

