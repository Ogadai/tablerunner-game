import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';
import * as Ably from 'ably';
import GameTopic from './game-topic';
import GameTopicService from './game-topic-service';
import { GameTopicMessageType } from '../../lib/message-types';

const mockPresence = {
  enter: jest.fn(),
  update: jest.fn(),
  get: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  leave: jest.fn().mockResolvedValue(undefined),
};

const mockChannel = {
  presence: mockPresence,
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  state: 'attached',
};

const mockAbly = {
  channels: {
    get: jest.fn(() => mockChannel),
  },
};

jest.mock('ably', () => ({
  Realtime: jest.fn(() => mockAbly),
}));

describe('GameTopic', () => {
  const topicId = 'board-1-map-2';
  const playerId = 'player-12345';

  beforeEach(() => {
    jest.clearAllMocks();
    mockPresence.leave.mockResolvedValue(undefined);
    mockChannel.state = 'attached';
  });

  it('renders the number of active users', () => {
    render(<GameTopic topicId={topicId} playerId={playerId} />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('enters the correct Ably presence channel', () => {
    render(<GameTopic topicId={topicId} playerId={playerId} />);

    expect(mockAbly.channels.get).toHaveBeenCalledWith(`game:${topicId}`);
    expect(mockPresence.enter).toHaveBeenCalledWith({
      name: 'Player-playe',
    });
  });

  it('reports a connected member when presence changes', async () => {
    const onBleStatusReceived = jest.fn();
    const members = [
      { data: { connected: false } },
      { data: { connected: true, playerId: 'other-player' } },
    ];

    mockPresence.get.mockResolvedValue(members);

    render(
      <GameTopic
        topicId={topicId}
        playerId={playerId}
        onBleStatusReceived={onBleStatusReceived}
      />,
    );

    const presenceChangeCallback = mockPresence.subscribe.mock.calls.find(
      ([events]) =>
        Array.isArray(events) &&
        events.includes('enter') &&
        events.includes('leave'),
    )?.[1];

    await act(async () => {
      await presenceChangeCallback();
    });

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(onBleStatusReceived).toHaveBeenCalledWith({
      connected: true,
      playerId: 'other-player',
    });
  });

  it('reports disconnected when no connected member remains', async () => {
    const onBleStatusReceived = jest.fn();

    mockPresence.get.mockResolvedValue([{ data: { connected: false } }]);

    render(
      <GameTopic
        topicId={topicId}
        playerId={playerId}
        onBleStatusReceived={onBleStatusReceived}
      />,
    );

    const presenceChangeCallback = mockPresence.subscribe.mock.calls.find(
      ([events]) =>
        Array.isArray(events) &&
        events.includes('enter') &&
        events.includes('leave'),
    )?.[1];

    await act(async () => {
      await presenceChangeCallback();
    });

    expect(onBleStatusReceived).toHaveBeenCalledWith({ connected: false });
  });

  it('forwards presence updates to the BLE status callback', () => {
    const onBleStatusReceived = jest.fn();

    render(
      <GameTopic
        topicId={topicId}
        playerId={playerId}
        onBleStatusReceived={onBleStatusReceived}
      />,
    );

    const presenceUpdateCallback = mockPresence.subscribe.mock.calls.find(
      ([events]) =>
        Array.isArray(events) && events.length === 1 && events[0] === 'update',
    )?.[1];

    const status = { connected: true, playerId: 'other-player' };

    act(() => {
      presenceUpdateCallback({ data: status });
    });

    expect(onBleStatusReceived).toHaveBeenCalledWith(status);
  });

  it('updates its own presence status through the registered callback', () => {
    const onSetBleStatusCallback = jest.fn();

    render(
      <GameTopic
        topicId={topicId}
        playerId={playerId}
        onSetBleStatusCallback={onSetBleStatusCallback}
      />,
    );

    const setBleStatusCallback = onSetBleStatusCallback.mock.calls[0][0];
    const status = { connected: true, playerId };

    act(() => {
      setBleStatusCallback(status);
    });

    expect(mockPresence.update).toHaveBeenCalledWith(status);
  });

  it('raises game-state updates through GameTopicService', () => {
    const raiseGameStateUpdatedSpy = jest.spyOn(
      GameTopicService,
      'raiseGameStateUpdated',
    );

    render(<GameTopic topicId={topicId} playerId={playerId} />);

    const channelMessageCallback = mockChannel.subscribe.mock.calls[0][0];

    channelMessageCallback({
      name: GameTopicMessageType.GameStateUpdated,
    });

    expect(raiseGameStateUpdatedSpy).toHaveBeenCalledWith(topicId);

    raiseGameStateUpdatedSpy.mockRestore();
  });

  it('ignores unrelated channel messages', () => {
    const raiseGameStateUpdatedSpy = jest.spyOn(
      GameTopicService,
      'raiseGameStateUpdated',
    );

    render(<GameTopic topicId={topicId} playerId={playerId} />);

    const channelMessageCallback = mockChannel.subscribe.mock.calls[0][0];

    channelMessageCallback({ name: 'unrelated-message' });

    expect(raiseGameStateUpdatedSpy).not.toHaveBeenCalled();

    raiseGameStateUpdatedSpy.mockRestore();
  });

  it('cleans up subscriptions and presence on unmount', () => {
    const { unmount } = render(
      <GameTopic topicId={topicId} playerId={playerId} />,
    );

    unmount();

    expect(mockPresence.unsubscribe).toHaveBeenCalled();
    expect(mockPresence.leave).toHaveBeenCalled();
    expect(mockChannel.unsubscribe).toHaveBeenCalled();
  });
});
