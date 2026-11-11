import {
  getLocationRegionInfo,
  buildLocationImagePrompt,
  getLocationImageBlobPath,
  getResourceRootUrl,
  getLocationImageUrl,
  checkLocationImageExists,
  resizeImageToLocationDimensions,
  getOrGenerateLocationImage,
  downloadLocationImage,
  getLocationImagePresignedUrl,
} from './location-images';
import { generateImage } from 'ai';
import { uploadToR2, getR2DownloadUrl, downloadFromR2 } from './r2-storage';
import { lockLocationImageInRedis, RedisLockError } from '@/lib/store/redis-access';

jest.mock('@/lib/store/redis-access', () => {
  class MockRedisLockError extends Error {
    constructor() {
      super('Failed to acquire lock');
      this.name = 'RedisLockError';
    }
  }

  return {
    lockLocationImageInRedis: jest.fn(),
    RedisLockError: MockRedisLockError,
    locationImageLockTTL: 10000,
    locationImageLockWaitMs: 10000,
  };
});

const mockToBuffer = jest.fn().mockResolvedValue(Buffer.from([10, 20, 30]));
const mockPng = jest.fn().mockReturnValue({ toBuffer: mockToBuffer });
const mockResize = jest.fn().mockReturnValue({ png: mockPng });
const mockSharp = jest.fn().mockReturnValue({ resize: mockResize });

jest.mock('sharp', () => ({
  __esModule: true,
  default: Object.assign(
    jest.fn((...args: any[]) => mockSharp(...args)),
    { fit: { cover: 'cover' } }
  ),
}));

jest.mock('ai', () => ({
  generateImage: jest.fn(),
}));

jest.mock('@ai-sdk/google', () => ({
  google: {
    image: jest.fn((model: string) => ({ modelId: model })),
  },
}));

jest.mock('./r2-storage', () => ({
  uploadToR2: jest.fn(),
  getR2DownloadUrl: jest.fn(),
  downloadFromR2: jest.fn(),
  checkR2ObjectExists: jest.fn(),
  getR2Client: jest.fn(),
}));

describe('location-images service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLocationRegionInfo', () => {
    it('identifies locations inside the castle (top 2 rows, right 7 columns)', () => {
      // Cell 224 is in row 11, col 16 (castle top row)
      const info = getLocationRegionInfo(224, false);
      expect(info.isInsideCastle).toBe(true);
      expect(info.regionDescription).toContain('inside the grand stone halls of the evil castle');

      // Underground inside castle
      const undergroundInfo = getLocationRegionInfo(224, true);
      expect(undergroundInfo.isInsideCastle).toBe(true);
      expect(undergroundInfo.regionDescription).toContain('inside the dark stone dungeons and ancient catacombs beneath the evil castle');
    });

    it('identifies volcano region in the top left', () => {
      // Cell 240 is row 11, col 0 (top-left)
      const info = getLocationRegionInfo(240, false);
      expect(info.isInsideCastle).toBe(false);
      expect(info.regionDescription).toContain('volcano');

      const undergroundInfo = getLocationRegionInfo(240, true);
      expect(undergroundInfo.regionDescription).toContain('volcanic cavern tunnels');
    });

    it('identifies castle perimeter when in upper right but not inside castle', () => {
      // Cell 184 is row 9, col 16 (below top 2 rows)
      const info = getLocationRegionInfo(184, false);
      expect(info.isInsideCastle).toBe(false);
      expect(info.regionDescription).toContain('approaches and rugged perimeter outside the towering walls');
    });

    it('identifies desert region in lower right (> col 13 and < row 6)', () => {
      // Cell 20 is row 0, col 19 (bottom-right: col > 13 and row < 6)
      const info = getLocationRegionInfo(20, false);
      expect(info.isInsideCastle).toBe(false);
      expect(info.regionDescription).toContain('desert');

      // Cell 107 is row 5, col 13 (not > 13, so not desert)
      const col13Info = getLocationRegionInfo(107, false);
      expect(col13Info.regionDescription).toContain('forest');

      // Cell 140 is row 6, col 19 (not < 6, so not desert)
      const row6Info = getLocationRegionInfo(140, false);
      expect(row6Info.regionDescription).toContain('forest');
    });

    it('identifies forest region in lower left', () => {
      // Cell 1 is row 0, col 0 (bottom-left)
      const info = getLocationRegionInfo(1, false);
      expect(info.isInsideCastle).toBe(false);
      expect(info.regionDescription).toContain('forest');
    });
  });

  describe('buildLocationImagePrompt', () => {
    it('includes location description, setting, and negative instructions against people and animals', () => {
      const prompt = buildLocationImagePrompt('A winding stone trail', 1, false);
      expect(prompt).toContain('A winding stone trail');
      expect(prompt).toContain('forest');
      expect(prompt).toContain('Camera facing North, looking northward into the landscape.');
      expect(prompt).toContain('do NOT include any people, characters, humanoids, monsters, animals, or living creatures');
      expect(prompt).toContain('Wide panoramic composition');
    });

    it('formats underground setting appropriately without north orientation', () => {
      const prompt = buildLocationImagePrompt('Dripping cavern', 1, true);
      expect(prompt).toContain('Subterranean fantasy underground location');
      expect(prompt).toContain('Dripping cavern');
      expect(prompt).not.toContain('Camera facing North');
    });

    it('formats inside locations with indoor fantasy setting and mood (case-insensitive)', () => {
      const prompt = buildLocationImagePrompt('Inside a small shop', 57, false);
      expect(prompt).toBe(
        'Indoor fantasy setting: Inside a small shop. detailed fantasy digital art style, atmospheric lighting, cinematic mood.'
      );
      expect(prompt).not.toContain('Camera facing North');
      expect(prompt).not.toContain('Location setting: Located');

      const lowercasePrompt = buildLocationImagePrompt('inside the witch\'s hut', 80, true);
      expect(lowercasePrompt).toBe(
        'Indoor fantasy setting: inside the witch\'s hut. detailed fantasy digital art style, atmospheric lighting, cinematic mood.'
      );
      expect(lowercasePrompt).not.toContain('Subterranean fantasy underground location');
    });

    it('formats castle interior locations without outdoor cues or north orientation', () => {
      // Cell 224 is in row 11, col 16 (inside castle)
      const prompt = buildLocationImagePrompt('The castle grand ballroom. Exits are East and West', 224, false);
      expect(prompt).toContain('Interior castle fantasy setting: The castle grand ballroom. Exits are East and West.');
      expect(prompt).toContain('inside the grand stone halls of the evil castle of the Lich King');
      expect(prompt).not.toContain('Outdoor fantasy landscape');
      expect(prompt).not.toContain('Camera facing North');
      expect(prompt).not.toContain('looking northward into the landscape');

      const undergroundPrompt = buildLocationImagePrompt('Dungeon corridor', 224, true);
      expect(undergroundPrompt).toContain('Subterranean fantasy castle dungeon: Dungeon corridor.');
      expect(undergroundPrompt).toContain('inside the dark stone dungeons and ancient catacombs beneath the evil castle');
      expect(undergroundPrompt).not.toContain('Outdoor fantasy landscape');
      expect(undergroundPrompt).not.toContain('Camera facing North');
    });
  });

  describe('getLocationImageBlobPath', () => {
    it('returns standard pathname for location', () => {
      expect(getLocationImageBlobPath(42)).toBe('location-images/location-42.png');
    });
  });

  describe('getResourceRootUrl & getLocationImageUrl', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      delete process.env.LOCATION_IMAGE_BASE_URL;
      delete process.env.NEXT_PUBLIC_LOCATION_IMAGE_BASE_URL;
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('returns LOCATION_IMAGE_BASE_URL when set', () => {
      process.env.LOCATION_IMAGE_BASE_URL = 'https://custom-blob.example.com/';
      expect(getResourceRootUrl()).toBe('https://custom-blob.example.com');
      expect(getLocationImageUrl(42)).toBe('https://custom-blob.example.com/location-images/location-42.png');
    });

    it('defaults to known game public store root URL', () => {
      expect(getResourceRootUrl()).toBe('https://eivregtw0c7oknqs.public.blob.vercel-storage.com');
      expect(getLocationImageUrl(1)).toBe('https://eivregtw0c7oknqs.public.blob.vercel-storage.com/location-images/location-1.png');
    });
  });

  describe('checkLocationImageExists', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('returns true when HEAD request returns ok', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200 } as any);
      const exists = await checkLocationImageExists('https://blob.example.com/location-images/location-1.png');
      expect(exists).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('https://blob.example.com/location-images/location-1.png', {
        method: 'HEAD',
        cache: 'no-store',
      });
    });

    it('returns false when HEAD request returns 404', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 404 } as any);
      const exists = await checkLocationImageExists('https://blob.example.com/location-images/location-1.png');
      expect(exists).toBe(false);
    });

    it('returns false when fetch rejects with a network error', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'));
      const exists = await checkLocationImageExists('https://blob.example.com/location-images/location-1.png');
      expect(exists).toBe(false);
      warnSpy.mockRestore();
    });
  });

  describe('resizeImageToLocationDimensions', () => {
    it('scales input buffer to 600px by 200px', async () => {
      const input = Buffer.from([1, 2, 3]);
      const result = await resizeImageToLocationDimensions(input);

      expect(mockSharp).toHaveBeenCalledWith(input);
      expect(mockResize).toHaveBeenCalledWith(600, 200, {
        fit: 'cover',
        position: 'center',
      });
      expect(mockPng).toHaveBeenCalledWith({ quality: 85, compressionLevel: 8 });
      expect(result).toEqual(Buffer.from([10, 20, 30]));
    });
  });

  describe('getOrGenerateLocationImage', () => {
    const releaseLock = jest.fn();
    const releaseWaitLock = jest.fn();
    const originalFetch = global.fetch;

    beforeEach(() => {
      releaseLock.mockResolvedValue(undefined);
      releaseWaitLock.mockResolvedValue(undefined);
      jest.mocked(lockLocationImageInRedis).mockResolvedValue(releaseLock);
      global.fetch = jest.fn().mockImplementation(async (url: any) => {
        if (typeof url === 'string' && url.includes('?v=')) {
          return { ok: true, status: 200 };
        }
        return { ok: false, status: 404 };
      });
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('returns cached blob URL if it already exists via HEAD request', async () => {
      jest.mocked(global.fetch).mockResolvedValueOnce({ ok: true, status: 200 } as any);

      const expectedUrl = getLocationImageUrl(224);
      const result = await getOrGenerateLocationImage(224);
      expect(result).toEqual({
        url: expectedUrl,
        cached: true,
      });
      expect(global.fetch).toHaveBeenCalledWith(expectedUrl, {
        method: 'HEAD',
        cache: 'no-store',
      });
      expect(lockLocationImageInRedis).not.toHaveBeenCalled();
      expect(generateImage).not.toHaveBeenCalled();
      expect(uploadToR2).not.toHaveBeenCalled();
    });

    it('generates an image and uploads to Cloudflare R2 when not cached and lock is acquired', async () => {
      const fakeUint8 = new Uint8Array([1, 2, 3]);
      jest.mocked(generateImage).mockResolvedValueOnce({
        image: {
          uint8Array: fakeUint8,
        },
      } as any);

      const expectedUrl = getLocationImageUrl(1);
      jest.mocked(uploadToR2).mockResolvedValueOnce({
        url: expectedUrl,
        key: 'location-images/location-1.png',
      });

      const result = await getOrGenerateLocationImage(1);

      expect(result.cached).toBe(false);
      expect(result.url).toMatch(new RegExp(`^${expectedUrl}\\?v=\\d+$`));

      expect(lockLocationImageInRedis).toHaveBeenCalledWith(1, 10000, 0);
      expect(releaseLock).toHaveBeenCalledTimes(1);

      expect(generateImage).toHaveBeenCalledWith(
        expect.objectContaining({
          aspectRatio: '16:9',
        })
      );

      expect(uploadToR2).toHaveBeenCalledWith(
        'location-images/location-1.png',
        Buffer.from([10, 20, 30]),
        {
          contentType: 'image/png',
        }
      );
    });

    it('waits for first request to complete and returns cached image when 2nd request arrives', async () => {
      // Lock acquisition with waitMs = 0 fails because another request holds the lock
      jest.mocked(lockLocationImageInRedis).mockRejectedValueOnce(new RedisLockError());

      // Lock acquisition with waitMs = 10000 succeeds once the first request finishes
      jest.mocked(lockLocationImageInRedis).mockResolvedValueOnce(releaseWaitLock);

      // Subsequent HEAD check after lock release returns ok: true (first request uploaded it)
      jest.mocked(global.fetch)
        .mockResolvedValueOnce({ ok: false, status: 404 } as any) // first check
        .mockResolvedValueOnce({ ok: true, status: 200 } as any);  // check after wait

      const expectedUrl = getLocationImageUrl(1);
      const result = await getOrGenerateLocationImage(1);

      expect(result.cached).toBe(true);
      expect(result.url).toMatch(new RegExp(`^${expectedUrl}\\?v=\\d+$`));

      expect(lockLocationImageInRedis).toHaveBeenNthCalledWith(1, 1, 10000, 0);
      expect(lockLocationImageInRedis).toHaveBeenNthCalledWith(2, 1, 10000, 10000);
      expect(releaseWaitLock).toHaveBeenCalledTimes(1);
      expect(generateImage).not.toHaveBeenCalled();
      expect(uploadToR2).not.toHaveBeenCalled();
    });

    it('assumes error and does not regenerate if second request times out waiting for the lock', async () => {
      // Initial fail-fast lock fails
      jest.mocked(lockLocationImageInRedis).mockRejectedValueOnce(new RedisLockError());
      // Wait lock also times out (10s elapsed)
      jest.mocked(lockLocationImageInRedis).mockRejectedValueOnce(new RedisLockError());

      await expect(getOrGenerateLocationImage(1)).rejects.toThrow('Timeout waiting for location 1 image generation');

      expect(generateImage).not.toHaveBeenCalled();
      expect(uploadToR2).not.toHaveBeenCalled();
    });

    it('treats missing image after lock release as error and does not regenerate', async () => {
      // Initial fail-fast lock fails
      jest.mocked(lockLocationImageInRedis).mockRejectedValueOnce(new RedisLockError());
      // Wait lock succeeds
      jest.mocked(lockLocationImageInRedis).mockResolvedValueOnce(releaseWaitLock);

      // HEAD check after waiting still returns 404 (first requester failed)
      jest.mocked(global.fetch).mockResolvedValue({ ok: false, status: 404 } as any);

      await expect(getOrGenerateLocationImage(1)).rejects.toThrow('Location 1 image generation failed or image not found');

      expect(releaseWaitLock).toHaveBeenCalledTimes(1);
      expect(generateImage).not.toHaveBeenCalled();
      expect(uploadToR2).not.toHaveBeenCalled();
    });

    it('releases lock even when image generation fails', async () => {
      jest.mocked(generateImage).mockRejectedValueOnce(new Error('AI Service Unavailable'));

      await expect(getOrGenerateLocationImage(1)).rejects.toThrow('AI Service Unavailable');
      expect(releaseLock).toHaveBeenCalledTimes(1);
    });

    it('throws an error if location does not exist in sharedLocations', async () => {
      await expect(getOrGenerateLocationImage(9999)).rejects.toThrow('Location 9999 not found');
      expect(lockLocationImageInRedis).not.toHaveBeenCalled();
    });
  });

  describe('downloadLocationImage & getLocationImagePresignedUrl', () => {
    it('downloads location image buffer using downloadFromR2', async () => {
      const mockBuffer = Buffer.from([1, 2, 3]);
      jest.mocked(downloadFromR2).mockResolvedValueOnce(mockBuffer);

      const result = await downloadLocationImage(42);
      expect(result).toBe(mockBuffer);
      expect(downloadFromR2).toHaveBeenCalledWith('location-images/location-42.png');
    });

    it('generates presigned download url using getR2DownloadUrl', async () => {
      jest.mocked(getR2DownloadUrl).mockResolvedValueOnce('https://r2.example.com/presigned-42');

      const result = await getLocationImagePresignedUrl(42, 1800);
      expect(result).toBe('https://r2.example.com/presigned-42');
      expect(getR2DownloadUrl).toHaveBeenCalledWith('location-images/location-42.png', { expiresIn: 1800 });
    });
  });
});

