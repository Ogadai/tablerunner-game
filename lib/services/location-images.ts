import { generateImage } from 'ai';
import { google } from '@ai-sdk/google';
import sharp from 'sharp';
import {
  uploadToR2,
  getR2DownloadUrl,
  downloadFromR2,
  checkR2ObjectExists,
  getR2Client,
} from './r2-storage';
import { sharedLocations } from '@/lib/games/maps/shared-locations';
import { getCellCoordinates } from '@/lib/games/gridCells';
import {
  lockLocationImageInRedis,
  RedisLockError,
  locationImageLockTTL,
  locationImageLockWaitMs,
} from '@/lib/store/redis-access';

export interface LocationRegionInfo {
  row: number;
  col: number;
  isInsideCastle: boolean;
  regionDescription: string;
}

export function getLocationRegionInfo(locationId: number, underground?: boolean): LocationRegionInfo {
  const { row, col } = getCellCoordinates(locationId);

  // Top 2 rows (rows 10-11) and right 7 columns (cols 13-19)
  const isInsideCastle = row >= 10 && col >= 13;
  const isDesert = row < 6 && col > 13;

  let regionDescription = '';

  if (isInsideCastle) {
    if (underground) {
      regionDescription = 'inside the dark stone dungeons and ancient catacombs beneath the evil castle of the Lich King. Vaulted damp stone corridors, iron grates, and cold stone walls';
    } else {
      regionDescription = 'inside the grand stone halls of the evil castle of the Lich King. Gothic architecture, imposing stone archways, dark vaulted ceilings, and towering stone pillars';
    }
  } else if (underground) {
    if (row >= 8 && col < 10) {
      regionDescription = 'deep inside volcanic cavern tunnels beneath the volcano. Basalt rock walls, glowing veins of lava, rising steam, and volcanic heat';
    } else if (isDesert) {
      regionDescription = 'inside an ancient subterranean desert cave network. Sandstone caverns, dry dust, and ancient rock formations';
    } else {
      regionDescription = 'inside a deep underground cavern system. Jagged stalactites, damp moss-covered rock walls, and dark underground tunnels';
    }
  } else {
    if (row >= 8 && col < 10) {
      regionDescription = 'in the rugged volcanic peaks and volcanic wasteland near the volcano. Dark basalt rocks, smoking vents, and distant glowing lava';
    } else if (row >= 8 && col >= 10) {
      regionDescription = 'in the rocky approaches and rugged perimeter outside the towering walls and dark spires of the Lich King\'s castle';
    } else if (isDesert) {
      regionDescription = 'in the sun-baked desert wasteland. Golden sand dunes, rocky desert ridges, and dry arid terrain';
    } else {
      regionDescription = 'in the dense temperate forest. Towering ancient trees, dappled sunlight through foliage, and winding woodland paths';
    }
  }

  return { row, col, isInsideCastle, regionDescription };
}

export function buildLocationImagePrompt(description: string, locationId: number, underground?: boolean): string {
  const fantastMood = 'detailed fantasy digital art style, atmospheric lighting, cinematic mood';
  if (description.toLocaleLowerCase().startsWith('inside')) {
    return `Indoor fantasy setting: ${description.trim()}. ${fantastMood}.`;
  }
  const { regionDescription } = getLocationRegionInfo(locationId, underground);
  const settingType = underground ? 'Subterranean fantasy underground location' : 'Outdoor fantasy landscape';
  const orientation = underground ? '' : 'Camera facing North, looking northward into the landscape. ';

  return `${settingType}: ${description.trim()}. Location setting: Located ${regionDescription}. ${orientation}Environment only, establishing shot. Wide panoramic composition, ${fantastMood}. Strictly empty scenery: do NOT include any people, characters, humanoids, monsters, animals, or living creatures in the scene.`;
}

export function getLocationImageBlobPath(locationId: number): string {
  return `location-images/location-${locationId}.png`;
}

export async function resizeImageToLocationDimensions(inputBuffer: Buffer | Uint8Array): Promise<Buffer> {
  return sharp(inputBuffer)
    .resize(600, 200, {
      fit: 'cover',
      position: 'center',
    })
    .png({ quality: 85, compressionLevel: 8 })
    .toBuffer();
}

export function getLocationImageRootUrl(): string {
  if (process.env.LOCATION_IMAGE_BASE_URL) {
    return process.env.LOCATION_IMAGE_BASE_URL.replace(/\/+$/, '');
  }
  return 'https://eivregtw0c7oknqs.public.blob.vercel-storage.com';
}

export function getLocationImageUrl(locationId: number): string {
  const rootUrl = getLocationImageRootUrl();
  const pathname = getLocationImageBlobPath(locationId);
  return `${rootUrl}/${pathname}`;
}

export async function checkLocationImageExists(url: string): Promise<boolean> {
  if (typeof fetch !== 'function') {
    return false;
  }
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      cache: 'no-store',
    });
    return response.ok;
  } catch (error) {
    console.warn(`Unable to verify location image at ${url}:`, error);
    return false;
  }
}

export async function getOrGenerateLocationImage(locationId: number): Promise<{ url: string; cached: boolean }> {
  const imageUrl = getLocationImageUrl(locationId);

  // 1. Check if the image has already been generated and uploaded to Vercel Blob via HEAD request (CDN hit)
  const alreadyExists = await checkLocationImageExists(imageUrl);
  if (alreadyExists) {
    return { url: imageUrl, cached: true };
  }

  // 2. Lookup the location details
  const location = sharedLocations.find(l => l.id === locationId);
  if (!location) {
    throw new Error(`Location ${locationId} not found`);
  }

  // 3. Acquire Redis lock keyed on locationId (fail-fast to let the first requester generate)
  let releaseLock: (() => Promise<void>) | null = null;
  try {
    releaseLock = await lockLocationImageInRedis(locationId, locationImageLockTTL, 0);
  } catch (error) {
    if (error instanceof RedisLockError) {
      // 2nd and later requests wait for the first request to complete
      let releaseWaitLock: (() => Promise<void>) | null = null;
      try {
        releaseWaitLock = await lockLocationImageInRedis(
          locationId,
          locationImageLockTTL,
          locationImageLockWaitMs
        );
      } catch (waitError) {
        if (waitError instanceof RedisLockError) {
          throw new Error(`Timeout waiting for location ${locationId} image generation`);
        }
        throw waitError;
      }

      try {
        // First request completed; check if the newly generated image is now in Blob store via HEAD request.
        // Use a cache-busting timestamp and brief retries to avoid stale negative (404) cache on edge CDNs.
        let existsAfterWait = false;
        let verifiedUrl = `${imageUrl}?v=${Date.now()}`;
        for (let attempt = 0; attempt < 3; attempt++) {
          verifiedUrl = `${imageUrl}?v=${Date.now()}`;
          existsAfterWait = await checkLocationImageExists(verifiedUrl);
          if (existsAfterWait) {
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        if (existsAfterWait) {
          return { url: verifiedUrl, cached: true };
        }
        throw new Error(`Location ${locationId} image generation failed or image not found`);
      } finally {
        if (releaseWaitLock) {
          await releaseWaitLock();
        }
      }
    }
    throw error;
  }

  // 4. We are the first requester; generate image and upload to Blob store
  try {
    // Double-check via HEAD request in case it was uploaded just before lock acquisition
    const currentExists = await checkLocationImageExists(imageUrl);
    if (currentExists) {
      return { url: imageUrl, cached: true };
    }

    const pathname = getLocationImageBlobPath(locationId);

    // Build evocative prompt with biome, castle specificity, and empty scene constraints
    const prompt = buildLocationImagePrompt(location.description, locationId, location.underground);
    const imageModel = process.env.GOOGLE_IMAGE_MODEL || 'gemini-2.5-flash-image';

    // Generate the image with Gemini Image model
    const { image } = await generateImage({
      model: google.image(imageModel),
      prompt,
      aspectRatio: '16:9',
    });

    // Scale image to 600px * 200px before uploading to Cloudflare R2
    const scaledImageBuffer = await resizeImageToLocationDimensions(image.uint8Array);

    // Upload scaled image to Cloudflare R2 storage
    const uploadResult = await uploadToR2(pathname, scaledImageBuffer, {
      contentType: 'image/png',
    });

    // Append cache-buster query parameter to newly generated URL so the client browser avoids
    // any edge CDN 404 response cached prior to the upload completing.
    const newImageUrl = `${uploadResult.url || imageUrl}?v=${Date.now()}`;

    // Verify the newly uploaded blob is publicly readable on the CDN before returning the URL
    // to prevent race conditions with edge replication where the client requests the image too early.
    for (let attempt = 0; attempt < 5; attempt++) {
      const isReadable = await checkLocationImageExists(newImageUrl);
      if (isReadable) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    return { url: newImageUrl, cached: false };
  } finally {
    if (releaseLock) {
      await releaseLock();
    }
  }
}

/**
 * Downloads a location image directly from Cloudflare R2 storage.
 */
export async function downloadLocationImage(locationId: number): Promise<Buffer> {
  const pathname = getLocationImageBlobPath(locationId);
  return downloadFromR2(pathname);
}

/**
 * Generates a presigned download URL for a location image using @aws-sdk/s3-request-presigner.
 */
export async function getLocationImagePresignedUrl(locationId: number, expiresIn?: number): Promise<string> {
  const pathname = getLocationImageBlobPath(locationId);
  return getR2DownloadUrl(pathname, { expiresIn });
}

export {
  getR2Client,
  uploadToR2,
  getR2DownloadUrl,
  downloadFromR2,
  checkR2ObjectExists,
};

