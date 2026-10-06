import type { RaceTeamUpdatedMessage } from '@/lib/message-types';

type RaceTeamUpdatedListener = (message: RaceTeamUpdatedMessage) => void;

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

  static raiseRaceTeamUpdated(topicId: string, message: RaceTeamUpdatedMessage): void {
    if (!message || typeof message.playerId !== 'string'
      || (message.team !== 'blue' && message.team !== 'red' && message.team !== null)) return;
    this.listeners.get(topicId)?.forEach(listener => listener(message));
  }
}

export default RaceTeamTopicService;
