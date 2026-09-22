import { useEffect, useState } from 'react';
import { GameTopicMessageType } from '@/lib/message-types';
import VideoTopicService, { VideoTopicMessage } from '@/app/message-bus/video-topic-service';
import styles from './player-video.module.css';

export default function PlayerVideo({ topicId }: { topicId: string }) {
  const [preloadedUrls, setPreloadedUrls] = useState<string[]>([]);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);

  useEffect(() => VideoTopicService.subscribe(topicId, (message: VideoTopicMessage) => {
    if (message.type === GameTopicMessageType.VideoPreload) {
      setPreloadedUrls(urls => urls.includes(message.url) ? urls : [...urls, message.url]);
    } else {
      setPlayingUrl(message.url);
    }
  }), [topicId]);

  if (playingUrl) {
    console.log('playing video', playingUrl);
  }

return <>
    {preloadedUrls.map(url => (
      <video key={url} src={url} preload="auto" hidden aria-hidden="true" />
    ))}
    {playingUrl && <div className={styles.videoOverlay} role="dialog" aria-label="Video playback">
      <video
        key={playingUrl}
        className={styles.video}
        src={playingUrl}
        autoPlay
        controls
        onEnded={() => setPlayingUrl(null)}
      />
      <button
        type="button"
        className={styles.closeButton}
        aria-label="Close video"
        onClick={() => setPlayingUrl(null)}
      >
        <span className="material-symbols-outlined">close</span>
      </button>
    </div>}
  </>;
}