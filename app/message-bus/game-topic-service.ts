type GameStateUpdatedListener = () => void;

class GameTopicService {
  private static readonly listeners = new Map<string, Set<GameStateUpdatedListener>>();

  static subscribe(topicId: string, listener: GameStateUpdatedListener): () => void {
    const topicListeners = this.listeners.get(topicId) ?? new Set<GameStateUpdatedListener>();
    topicListeners.add(listener);
    this.listeners.set(topicId, topicListeners);

    return () => {
      topicListeners.delete(listener);
      if (topicListeners.size === 0) {
        this.listeners.delete(topicId);
      }
    };
  }

  static raiseGameStateUpdated(topicId: string): void {
    this.listeners.get(topicId)?.forEach(listener => listener());
  }
}

export default GameTopicService;
