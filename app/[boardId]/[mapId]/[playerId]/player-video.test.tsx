import { act, fireEvent, render, screen } from '@testing-library/react';
import { GameTopicMessageType } from '@/lib/message-types';
import VideoTopicService from '@/app/message-bus/video-topic-service';
import PlayerVideo from './player-video';

describe('PlayerVideo', () => {
  const topicId = 'board-1-map-2';

  it('preloads video URLs from video preload messages', () => {
    render(<PlayerVideo topicId={topicId} />);

    act(() => {
      VideoTopicService.raiseVideoMessage(topicId, {
        type: GameTopicMessageType.VideoPreload,
        url: '/videos/intro.mp4',
      });
    });

    expect(document.querySelector('video[preload="auto"]')).toHaveAttribute(
      'src',
      '/videos/intro.mp4',
    );
  });

  it('keeps the video open with controls after it ends', () => {
    render(<PlayerVideo topicId={topicId} />);

    act(() => {
      VideoTopicService.raiseVideoMessage(topicId, {
        type: GameTopicMessageType.VideoPlay,
        url: '/videos/intro.mp4',
      });
    });

    const dialog = screen.getByRole('dialog');
    const video = dialog.querySelector('video');
    expect(dialog).toBeInTheDocument();
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute('src', '/videos/intro.mp4');
    expect(video).toHaveAttribute('autoplay');
    expect(video).toHaveAttribute('controls');

    fireEvent.ended(video!);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});