type GameProcessingStartedListener = (processing: boolean) => void;

class GameProcessingStartedService {
  private static readonly listeners = new Map<string, Set<GameProcessingStartedListener>>();

  static subscribe(topicId: string, listener: GameProcessingStartedListener): () => void {
    const topicListeners = this.listeners.get(topicId) ?? new Set<GameProcessingStartedListener>();
    topicListeners.add(listener);
    this.listeners.set(topicId, topicListeners);

    return () => {
      topicListeners.delete(listener);
      if (topicListeners.size === 0) {
        this.listeners.delete(topicId);
      }
    };
  }

  static raiseGameProcessingStarted(topicId: string): void {
    this.listeners.get(topicId)?.forEach(listener => listener(true));
  }

  static raiseGameProcessingFailed(topicId: string): void {
    this.listeners.get(topicId)?.forEach(listener => listener(false));
  }
}

export default GameProcessingStartedService;
