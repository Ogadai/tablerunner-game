'use client';

import { useEffect, useState } from 'react';
import styles from './location-image.module.css';
import { getLocationImageUrl } from '@/lib/services/location-image-urls';

export interface LocationImageProps {
  locationId: number;
  description: string;
}

export function LocationImagePlaceholder() {
  return (
    <div
      className={styles.placeholderContainer}
      aria-hidden="true"
      data-testid="location-image-placeholder"
    >
      <span className={`material-symbols-outlined ${styles.placeholderIcon}`}>image</span>
    </div>
  );
}

export async function fetchLocationImageUrl(locationId: number): Promise<string | null> {
  if (typeof fetch !== 'function') {
    return null;
  }
  try {
    const res = await fetch(`/api/locations/${locationId}/image`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error(`Failed to fetch image for location ${locationId}: status ${res.status}`);
      return null;
    }
    const data = await res.json();
    return data?.url || null;
  } catch (error) {
    console.error(`Error fetching image for location ${locationId}:`, error);
    return null;
  }
}

type ImageStatus =
  | { stage: 'direct'; url: string }
  | { stage: 'generating' }
  | { stage: 'loaded'; url: string }
  | { stage: 'error' };

function LocationImageContent({
  locationId,
  description,
}: {
  locationId: number;
  description: string;
}) {
  const [status, setStatus] = useState<ImageStatus>(() => ({
    stage: 'direct',
    url: getLocationImageUrl(locationId),
  }));

  useEffect(() => {
    let isCancelled = false;

    if (status.stage === 'generating') {
      fetchLocationImageUrl(locationId).then((url) => {
        if (isCancelled) return;
        if (url) {
          setStatus({ stage: 'loaded', url });
        } else {
          setStatus({ stage: 'error' });
        }
      });
    }

    return () => {
      isCancelled = true;
    };
  }, [status.stage, locationId]);

  if (status.stage === 'error') {
    return null;
  }

  if (status.stage === 'generating') {
    return <LocationImagePlaceholder />;
  }

  return (
    <div className={styles.locationImageContainer}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={status.url}
        alt={description}
        title={description}
        className={styles.locationImage}
        onError={() => {
          if (status.stage === 'direct') {
            setStatus({ stage: 'generating' });
          } else {
            console.error(`Failed to load location image at ${status.url}`);
            setStatus({ stage: 'error' });
          }
        }}
      />
    </div>
  );
}

export default function LocationImage({ locationId, description }: LocationImageProps) {
  if (!locationId || locationId <= 0 || isNaN(locationId)) {
    return <p className={styles.fallbackDescription}>{description}</p>;
  }

  return (
    <>
      <LocationImageContent key={locationId} locationId={locationId} description={description} />
      <p className={styles.fallbackDescription}>{description}</p>
    </>
  );
}
