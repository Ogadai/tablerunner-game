/** @jest-environment node */
import {
  getR2Client,
  constructR2PublicUrl,
  uploadToR2,
  getR2DownloadUrl,
  downloadFromR2,
  checkR2ObjectExists,
  listObjectsFromR2,
} from './r2-storage';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn(),
    })),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('r2-storage service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      R2_ACCOUNT_ID: 'test-account-id',
      R2_ACCESS_KEY_ID: 'test-access-key-id',
      R2_SECRET_ACCESS_KEY: 'test-secret-access-key',
      R2_PUBLIC_BUCKET_NAME: 'test-bucket',
      LOCATION_IMAGE_BASE_URL: 'https://cdn.example.com',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getR2Client', () => {
    it('creates an S3Client with region "auto", the correct Cloudflare R2 endpoint, and credentials', () => {
      getR2Client();

      expect(S3Client).toHaveBeenCalledWith({
        region: 'auto',
        endpoint: 'https://test-account-id.r2.cloudflarestorage.com',
        credentials: {
          accessKeyId: 'test-access-key-id',
          secretAccessKey: 'test-secret-access-key',
        },
      });
    });

    it('handles missing credentials safely by defaulting to empty strings', () => {
      delete process.env.R2_ACCESS_KEY_ID;
      delete process.env.R2_SECRET_ACCESS_KEY;

      getR2Client();

      expect(S3Client).toHaveBeenCalledWith({
        region: 'auto',
        endpoint: 'https://test-account-id.r2.cloudflarestorage.com',
        credentials: {
          accessKeyId: '',
          secretAccessKey: '',
        },
      });
    });
  });

  describe('constructR2PublicUrl', () => {
    it('constructs url using LOCATION_IMAGE_BASE_URL without trailing slashes', () => {
      process.env.LOCATION_IMAGE_BASE_URL = 'https://media.example.com///';
      const url = constructR2PublicUrl('location-images/location-1.png');
      expect(url).toBe('https://media.example.com/location-images/location-1.png');
    });

    it('strips leading slashes from key', () => {
      const url = constructR2PublicUrl('/location-images/location-2.png');
      expect(url).toBe('https://cdn.example.com/location-images/location-2.png');
    });

    it('returns the key if LOCATION_IMAGE_BASE_URL is empty', () => {
      delete process.env.LOCATION_IMAGE_BASE_URL;
      const url = constructR2PublicUrl('location-images/location-3.png');
      expect(url).toBe('location-images/location-3.png');
    });
  });

  describe('uploadToR2', () => {
    it('uploads a buffer using PutObjectCommand to R2_PUBLIC_BUCKET_NAME and returns public url', async () => {
      const mockSend = jest.fn().mockResolvedValueOnce({ ETag: '"test-etag"' });
      jest.mocked(S3Client).mockImplementationOnce(() => ({
        send: mockSend,
      } as unknown as S3Client));

      const buffer = Buffer.from([1, 2, 3]);
      const result = await uploadToR2('location-images/location-10.png', buffer, {
        contentType: 'image/png',
      });

      expect(mockSend).toHaveBeenCalledWith(expect.any(PutObjectCommand));
      const command = mockSend.mock.calls[0][0];
      expect(command.input).toEqual({
        Bucket: 'test-bucket',
        Key: 'location-images/location-10.png',
        Body: buffer,
        ContentType: 'image/png',
      });

      expect(result).toEqual({
        url: 'https://cdn.example.com/location-images/location-10.png',
        key: 'location-images/location-10.png',
      });
    });

    it('supports custom bucket override', async () => {
      const mockSend = jest.fn().mockResolvedValueOnce({});
      jest.mocked(S3Client).mockImplementationOnce(() => ({
        send: mockSend,
      } as unknown as S3Client));

      await uploadToR2('test.txt', 'hello', { bucket: 'custom-bucket' });

      const command = mockSend.mock.calls[0][0];
      expect(command.input.Bucket).toBe('custom-bucket');
    });
  });

  describe('getR2DownloadUrl', () => {
    it('generates a presigned download URL using getSignedUrl with GetObjectCommand', async () => {
      jest.mocked(getSignedUrl).mockResolvedValueOnce('https://presigned.r2.example.com/download');

      const url = await getR2DownloadUrl('location-images/location-5.png', {
        expiresIn: 7200,
      });

      expect(url).toBe('https://presigned.r2.example.com/download');
      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(GetObjectCommand),
        { expiresIn: 7200 }
      );
    });

    it('defaults expiresIn to 3600 seconds', async () => {
      jest.mocked(getSignedUrl).mockResolvedValueOnce('https://presigned.r2.example.com/download');

      await getR2DownloadUrl('location-images/location-5.png');

      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(GetObjectCommand),
        { expiresIn: 3600 }
      );
    });
  });

  describe('downloadFromR2', () => {
    it('downloads object buffer via GetObjectCommand', async () => {
      const mockTransform = jest.fn().mockResolvedValueOnce(new Uint8Array([10, 20, 30]));
      const mockSend = jest.fn().mockResolvedValueOnce({
        Body: {
          transformToByteArray: mockTransform,
        },
      });
      jest.mocked(S3Client).mockImplementationOnce(() => ({
        send: mockSend,
      } as unknown as S3Client));

      const buffer = await downloadFromR2('location-images/location-1.png');

      expect(mockSend).toHaveBeenCalledWith(expect.any(GetObjectCommand));
      const command = mockSend.mock.calls[0][0];
      expect(command.input).toEqual({
        Bucket: 'test-bucket',
        Key: 'location-images/location-1.png',
      });
      expect(buffer).toEqual(Buffer.from([10, 20, 30]));
    });

    it('throws if response Body is empty', async () => {
      const mockSend = jest.fn().mockResolvedValueOnce({ Body: null });
      jest.mocked(S3Client).mockImplementationOnce(() => ({
        send: mockSend,
      } as unknown as S3Client));

      await expect(downloadFromR2('empty.png')).rejects.toThrow('Empty response body for object: empty.png');
    });
  });

  describe('checkR2ObjectExists', () => {
    it('returns true when HeadObjectCommand succeeds', async () => {
      const mockSend = jest.fn().mockResolvedValueOnce({});
      jest.mocked(S3Client).mockImplementationOnce(() => ({
        send: mockSend,
      } as unknown as S3Client));

      const exists = await checkR2ObjectExists('location-images/location-1.png');
      expect(exists).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(expect.any(HeadObjectCommand));
    });

    it('returns false when HeadObjectCommand throws NotFound error', async () => {
      const notFoundErr = new Error('NotFound');
      notFoundErr.name = 'NotFound';
      const mockSend = jest.fn().mockRejectedValueOnce(notFoundErr);
      jest.mocked(S3Client).mockImplementationOnce(() => ({
        send: mockSend,
      } as unknown as S3Client));

      const exists = await checkR2ObjectExists('location-images/location-missing.png');
      expect(exists).toBe(false);
    });

    it('rethrows unexpected errors', async () => {
      const serverErr = new Error('Internal Server Error');
      const mockSend = jest.fn().mockRejectedValueOnce(serverErr);
      jest.mocked(S3Client).mockImplementationOnce(() => ({
        send: mockSend,
      } as unknown as S3Client));

      await expect(checkR2ObjectExists('location-images/location-err.png')).rejects.toThrow('Internal Server Error');
    });
  });

  describe('listObjectsFromR2', () => {
    it('lists objects under a prefix and paginates through multiple pages', async () => {
      const mockSend = jest.fn()
        .mockResolvedValueOnce({
          Contents: [
            { Key: 'saved-games/b/m/save-1.json', LastModified: new Date('2026-09-01'), Size: 100, ETag: '"etag-1"' },
          ],
          IsTruncated: true,
          NextContinuationToken: 'token-page-2',
        })
        .mockResolvedValueOnce({
          Contents: [
            { Key: 'saved-games/b/m/save-2.json', LastModified: new Date('2026-09-02'), Size: 200, ETag: '"etag-2"' },
          ],
          IsTruncated: false,
        });

      jest.mocked(S3Client).mockImplementationOnce(() => ({
        send: mockSend,
      } as unknown as S3Client));

      const items = await listObjectsFromR2('saved-games/b/m/');

      expect(items).toHaveLength(2);
      expect(items[0]).toEqual({
        pathname: 'saved-games/b/m/save-1.json',
        uploadedAt: new Date('2026-09-01'),
        size: 100,
        etag: '"etag-1"',
      });
      expect(items[1]).toEqual({
        pathname: 'saved-games/b/m/save-2.json',
        uploadedAt: new Date('2026-09-02'),
        size: 200,
        etag: '"etag-2"',
      });

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(mockSend).toHaveBeenCalledWith(expect.any(ListObjectsV2Command));
      expect(mockSend.mock.calls[0][0].input).toEqual({
        Bucket: 'test-bucket',
        Prefix: 'saved-games/b/m/',
        ContinuationToken: undefined,
        MaxKeys: 1000,
      });
      expect(mockSend.mock.calls[1][0].input).toEqual({
        Bucket: 'test-bucket',
        Prefix: 'saved-games/b/m/',
        ContinuationToken: 'token-page-2',
        MaxKeys: 1000,
      });
    });

    it('breaks if continuation token repeats to prevent infinite loop', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const mockSend = jest.fn()
        .mockResolvedValueOnce({
          Contents: [{ Key: 'save-1.json', LastModified: new Date(), Size: 50 }],
          IsTruncated: true,
          NextContinuationToken: 'stuck-token',
        })
        .mockResolvedValueOnce({
          Contents: [{ Key: 'save-2.json', LastModified: new Date(), Size: 50 }],
          IsTruncated: true,
          NextContinuationToken: 'stuck-token', // same token repeats!
        });

      jest.mocked(S3Client).mockImplementationOnce(() => ({
        send: mockSend,
      } as unknown as S3Client));

      const items = await listObjectsFromR2('prefix/');

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(items).toHaveLength(2);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Detected loop in continuation token'));
      warnSpy.mockRestore();
    });

    it('breaks when maxPages limit is reached', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const mockSend = jest.fn()
        .mockResolvedValueOnce({
          Contents: [{ Key: 'save-1.json', LastModified: new Date(), Size: 50 }],
          IsTruncated: true,
          NextContinuationToken: 'token-page-2',
        })
        .mockResolvedValueOnce({
          Contents: [{ Key: 'save-2.json', LastModified: new Date(), Size: 50 }],
          IsTruncated: true,
          NextContinuationToken: 'token-page-3',
        })
        .mockResolvedValueOnce({
          Contents: [{ Key: 'save-3.json', LastModified: new Date(), Size: 50 }],
          IsTruncated: true,
          NextContinuationToken: 'token-page-4',
        });

      jest.mocked(S3Client).mockImplementationOnce(() => ({
        send: mockSend,
      } as unknown as S3Client));

      const items = await listObjectsFromR2('prefix/', { maxPages: 3 });

      expect(mockSend).toHaveBeenCalledTimes(3);
      expect(items).toHaveLength(3);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Reached maximum page limit'));
      warnSpy.mockRestore();
    });

    it('handles empty Contents gracefully', async () => {
      const mockSend = jest.fn().mockResolvedValueOnce({
        Contents: undefined,
        IsTruncated: false,
      });

      jest.mocked(S3Client).mockImplementationOnce(() => ({
        send: mockSend,
      } as unknown as S3Client));

      const items = await listObjectsFromR2('empty/');
      expect(items).toEqual([]);
    });
  });
});
