import GameTopicService from './game-topic-service';

describe('GameTopicService', () => {
  const topicId = 'board-1-map-2';
  const otherTopicId = 'board-3-map-4';

  let unsubscribers: Array<() => void>;

  beforeEach(() => {
    unsubscribers = [];
  });

  afterEach(() => {
    unsubscribers.forEach(unsubscribe => unsubscribe());
  });

  function subscribe(topic: string, listener: () => void): void {
    unsubscribers.push(GameTopicService.subscribe(topic, listener));
  }

  it('notifies listeners subscribed to the matching topic', () => {
    const listener = jest.fn();

    subscribe(topicId, listener);

    GameTopicService.raiseGameStateUpdated(topicId);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not notify listeners subscribed to another topic', () => {
    const listener = jest.fn();

    subscribe(otherTopicId, listener);

    GameTopicService.raiseGameStateUpdated(topicId);

    expect(listener).not.toHaveBeenCalled();
  });

  it('notifies all listeners for a topic', () => {
    const firstListener = jest.fn();
    const secondListener = jest.fn();

    subscribe(topicId, firstListener);
    subscribe(topicId, secondListener);

    GameTopicService.raiseGameStateUpdated(topicId);

    expect(firstListener).toHaveBeenCalledTimes(1);
    expect(secondListener).toHaveBeenCalledTimes(1);
  });

  it('supports listeners subscribed to multiple topics independently', () => {
    const topicListener = jest.fn();
    const otherTopicListener = jest.fn();

    subscribe(topicId, topicListener);
    subscribe(otherTopicId, otherTopicListener);

    GameTopicService.raiseGameStateUpdated(topicId);

    expect(topicListener).toHaveBeenCalledTimes(1);
    expect(otherTopicListener).not.toHaveBeenCalled();

    GameTopicService.raiseGameStateUpdated(otherTopicId);

    expect(topicListener).toHaveBeenCalledTimes(1);
    expect(otherTopicListener).toHaveBeenCalledTimes(1);
  });

  it('stops notifying a listener after unsubscribe', () => {
    const listener = jest.fn();

    const unsubscribe = GameTopicService.subscribe(topicId, listener);

    GameTopicService.raiseGameStateUpdated(topicId);
    unsubscribe();
    GameTopicService.raiseGameStateUpdated(topicId);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not throw when raising an update for an unknown topic', () => {
    expect(() => {
      GameTopicService.raiseGameStateUpdated('unknown-topic');
    }).not.toThrow();
  });

  it('does not notify the same listener more than once per update', () => {
    const listener = jest.fn();

    subscribe(topicId, listener);
    subscribe(topicId, listener);

    GameTopicService.raiseGameStateUpdated(topicId);

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
