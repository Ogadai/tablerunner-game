import {
  getLocationImageBlobPath,
  getResourceRootUrl,
  getLocationImageUrl,
} from './location-image-urls';

describe('location-image-urls', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.LOCATION_IMAGE_BASE_URL;
    delete process.env.NEXT_PUBLIC_LOCATION_IMAGE_BASE_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getLocationImageBlobPath', () => {
    it('returns standard pathname for location', () => {
      expect(getLocationImageBlobPath(42)).toBe('location-images/location-42.png');
    });
  });

  describe('getResourceRootUrl & getLocationImageUrl', () => {
    it('returns LOCATION_IMAGE_BASE_URL when set', () => {
      process.env.LOCATION_IMAGE_BASE_URL = 'https://custom-blob.example.com/';
      expect(getResourceRootUrl()).toBe('https://custom-blob.example.com');
      expect(getLocationImageUrl(42)).toBe('https://custom-blob.example.com/location-images/location-42.png');
    });

    it('returns NEXT_PUBLIC_LOCATION_IMAGE_BASE_URL when set', () => {
      process.env.NEXT_PUBLIC_LOCATION_IMAGE_BASE_URL = 'https://public-blob.example.com/';
      expect(getResourceRootUrl()).toBe('https://public-blob.example.com');
      expect(getLocationImageUrl(42)).toBe('https://public-blob.example.com/location-images/location-42.png');
    });

    it('defaults to known game public store root URL', () => {
      expect(getResourceRootUrl()).toBe('https://eivregtw0c7oknqs.public.blob.vercel-storage.com');
      expect(getLocationImageUrl(1)).toBe('https://eivregtw0c7oknqs.public.blob.vercel-storage.com/location-images/location-1.png');
    });
  });
});
