'use client';

import { useState, useEffect } from 'react';
import styles from './location-image.module.css';

export interface LocationImageProps {
  locationId: number;
  description: string;
}

export default function LocationImage({ locationId, description }: LocationImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    setImageUrl(null);
    setIsLoaded(false);
    setHasError(false);

    if (typeof fetch !== 'function') {
      setHasError(true);
      return;
    }

    fetch(`/api/locations/${locationId}/image`, { signal: controller.signal })
      .then(async res => {
        if (!res.ok) {
          throw new Error(`Failed to load image: ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        if (!active) return;
        if (data?.url) {
          setImageUrl(data.url);
        } else {
          setHasError(true);
        }
      })
      .catch(err => {
        if (!active || err.name === 'AbortError') return;
        setHasError(true);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [locationId]);

  const showImage = imageUrl && !hasError && isLoaded;

  return (
    <>
      {imageUrl && !hasError && (
        <div
          className={styles.locationImageContainer}
          style={{ display: showImage ? 'flex' : 'none' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={description}
            title={description}
            className={styles.locationImage}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
          />
        </div>
      )}
      <p className={styles.fallbackDescription}>{description}</p>
    </>
  );
}

