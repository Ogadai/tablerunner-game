'use client';

import { Suspense, use, useMemo, useState } from 'react';
import styles from './location-image.module.css';

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

async function fetchLocationImageUrl(locationId: number): Promise<string | null> {
  if (typeof fetch !== 'function') {
    return null;
  }
  try {
    const res = await fetch(`/api/locations/${locationId}/image`);
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return data?.url || null;
  } catch {
    return null;
  }
}

function LocationImageContent({ promise, description }: { promise: Promise<string | null>; description: string }) {
  const imageUrl = use(promise);
  const [hasError, setHasError] = useState(false);

  if (!imageUrl || hasError) {
    return null;
  }

  return (
    <div className={styles.locationImageContainer}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={description}
        title={description}
        className={styles.locationImage}
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export default function LocationImage({ locationId, description }: LocationImageProps) {
  const imagePromise = useMemo(() => fetchLocationImageUrl(locationId), [locationId]);

  return (
    <>
      <Suspense fallback={<LocationImagePlaceholder />}>
        <LocationImageContent key={locationId} promise={imagePromise} description={description} />
      </Suspense>
      <p className={styles.fallbackDescription}>{description}</p>
    </>
  );
}


