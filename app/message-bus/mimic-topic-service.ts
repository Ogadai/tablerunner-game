import type { MimicWarningMessage } from '@/lib/message-types';

type MimicWarningListener = (message: MimicWarningMessage) => void;

class MimicTopicService {
  private static readonly listeners = new Map<string, Set<MimicWarningListener>>();

  static subscribe(topicId: string, listener: MimicWarningListener): () => void {
    const topicListeners = this.listeners.get(topicId) ?? new Set<MimicWarningListener>();
    topicListeners.add(listener);
    this.listeners.set(topicId, topicListeners);

    return () => {
      topicListeners.delete(listener);
      if (topicListeners.size === 0) {
        this.listeners.delete(topicId);
      }
    };
  }

  static raiseMimicWarning(topicId: string, message: MimicWarningMessage): void {
    this.listeners.get(topicId)?.forEach(listener => listener(message));
  }
}

export default MimicTopicService;

