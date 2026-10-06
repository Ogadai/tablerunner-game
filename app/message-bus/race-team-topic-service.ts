type RaceTeamUpdatedListener = () => void;

class RaceTeamTopicService {
  private static readonly listeners = new Map<string, Set<RaceTeamUpdatedListener>>();

  static subscribe(topicId: string, listener: RaceTeamUpdatedListener): () => void {
    const topicListeners = this.listeners.get(topicId) ?? new Set<RaceTeamUpdatedListener>();
    topicListeners.add(listener);
    this.listeners.set(topicId, topicListeners);

    return () => {
      topicListeners.delete(listener);
      if (topicListeners.size === 0) {
        this.listeners.delete(topicId);
      }
    };
  }

  static raiseRaceTeamUpdated(topicId: string): void {
    this.listeners.get(topicId)?.forEach(listener => listener());
  }
}

export default RaceTeamTopicService;
