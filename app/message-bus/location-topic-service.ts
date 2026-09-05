type LocationStateUpdatedListener = (locationId: number) => void;

class LocationTopicService {
  private static readonly listeners = new Map<string, Set<LocationStateUpdatedListener>>();

  static subscribe(topicId: string, listener: LocationStateUpdatedListener): () => void {
    const topicListeners = this.listeners.get(topicId) ?? new Set<LocationStateUpdatedListener>();
    topicListeners.add(listener);
    this.listeners.set(topicId, topicListeners);

    return () => {
      topicListeners.delete(listener);
      if (topicListeners.size === 0) {
        this.listeners.delete(topicId);
      }
    };
  }

  static raiseLocationStateUpdated(topicId: string, locationId: number): void {
    this.listeners.get(topicId)?.forEach(listener => listener(locationId));
  }
}

export default LocationTopicService;
