import {
  getLocationRegionInfo,
  buildLocationImagePrompt,
  getLocationImageBlobPath,
  resizeImageToLocationDimensions,
  getOrGenerateLocationImage,
} from './location-images';
import { generateImage } from 'ai';
import { list, put } from '@vercel/blob';

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

jest.mock('@vercel/blob', () => ({
  list: jest.fn(),
  put: jest.fn(),
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
  });

  describe('getLocationImageBlobPath', () => {
    it('returns standard pathname for location', () => {
      expect(getLocationImageBlobPath(42)).toBe('location-images/location-42.png');
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
    it('returns cached blob URL if it already exists in Vercel Blob', async () => {
      jest.mocked(list).mockResolvedValueOnce({
        blobs: [
          {
            pathname: 'location-images/location-224.png',
            url: 'https://blob.vercel-storage.com/cached-224.png',
            size: 1024,
            uploadedAt: new Date(),
            downloadUrl: 'https://blob.vercel-storage.com/cached-224.png',
          },
        ],
        hasMore: false,
      } as any);

      const result = await getOrGenerateLocationImage(224);
      expect(result).toEqual({
        url: 'https://blob.vercel-storage.com/cached-224.png',
        cached: true,
      });
      expect(generateImage).not.toHaveBeenCalled();
      expect(put).not.toHaveBeenCalled();
    });

    it('generates an image and uploads to blob when not cached', async () => {
      jest.mocked(list).mockResolvedValueOnce({ blobs: [], hasMore: false } as any);

      const fakeUint8 = new Uint8Array([1, 2, 3]);
      jest.mocked(generateImage).mockResolvedValueOnce({
        image: {
          uint8Array: fakeUint8,
        },
      } as any);

      jest.mocked(put).mockResolvedValueOnce({
        url: 'https://blob.vercel-storage.com/new-image-1.png',
        pathname: 'location-images/location-1.png',
      } as any);

      const result = await getOrGenerateLocationImage(1);

      expect(result).toEqual({
        url: 'https://blob.vercel-storage.com/new-image-1.png',
        cached: false,
      });

      expect(generateImage).toHaveBeenCalledWith(
        expect.objectContaining({
          aspectRatio: '16:9',
        })
      );

      expect(put).toHaveBeenCalledWith(
        'location-images/location-1.png',
        Buffer.from([10, 20, 30]),
        {
          access: 'public',
          contentType: 'image/png',
        }
      );
    });

    it('throws an error if location does not exist in sharedLocations', async () => {
      jest.mocked(list).mockResolvedValueOnce({ blobs: [], hasMore: false } as any);

      await expect(getOrGenerateLocationImage(9999)).rejects.toThrow('Location 9999 not found');
    });
  });
});

