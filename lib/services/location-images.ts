import { generateImage } from 'ai';
import { google } from '@ai-sdk/google';
import { put, list } from '@vercel/blob';
import sharp from 'sharp';
import { sharedLocations } from '@/lib/games/maps/shared-locations';
import { getCellCoordinates } from '@/lib/games/gridCells';

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
  const { regionDescription } = getLocationRegionInfo(locationId, underground);
  const settingType = underground ? 'Subterranean fantasy underground location' : 'Outdoor fantasy landscape';
  const orientation = underground ? '' : 'Camera facing North, looking northward into the landscape. ';

  return `${settingType}: ${description.trim()}. Location setting: Located ${regionDescription}. ${orientation}Environment only, establishing shot. Wide panoramic composition, detailed fantasy digital art style, atmospheric lighting, cinematic mood. Strictly empty scenery: do NOT include any people, characters, humanoids, monsters, animals, or living creatures in the scene.`;
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

export async function getOrGenerateLocationImage(locationId: number): Promise<{ url: string; cached: boolean }> {
  const pathname = getLocationImageBlobPath(locationId);

  // 1. Check if the image has already been generated and uploaded to Vercel Blob
  try {
    const existing = await list({ prefix: pathname });
    const match = existing.blobs.find(b => b.pathname === pathname);
    if (match) {
      return { url: match.url, cached: true };
    }
  } catch (error) {
    console.warn(`Unable to check existing blob for location ${locationId}:`, error);
  }

  // 2. Lookup the location details
  const location = sharedLocations.find(l => l.id === locationId);
  if (!location) {
    throw new Error(`Location ${locationId} not found`);
  }

  // 3. Build evocative prompt with biome, castle specificity, and empty scene constraints
  const prompt = buildLocationImagePrompt(location.description, locationId, location.underground);
  const imageModel = process.env.GOOGLE_IMAGE_MODEL || 'gemini-2.5-flash-image';

  // 4. Generate the image with Gemini Image model
  const { image } = await generateImage({
    model: google.image(imageModel),
    prompt,
    aspectRatio: '16:9',
  });

  // 5. Scale image to 600px * 200px before uploading to Blob storage
  const scaledImageBuffer = await resizeImageToLocationDimensions(image.uint8Array);

  // 6. Upload scaled image to Vercel Blob storage
  const blob = await put(pathname, scaledImageBuffer, {
    access: 'public',
    contentType: 'image/png',
  });

  return { url: blob.url, cached: false };
}

