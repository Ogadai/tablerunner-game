/** @jest-environment node */
import { GET } from './route';
import { getOrGenerateLocationImage } from '@/lib/services/location-images';

jest.mock('@/lib/services/location-images', () => ({
  getOrGenerateLocationImage: jest.fn(),
}));

describe('GET /api/locations/[locationId]/image', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 if locationId is invalid', async () => {
    const request = new Request('http://localhost/api/locations/abc/image');
    const response = await GET(request, { params: Promise.resolve({ locationId: 'abc' }) });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid location ID');
  });

  it('returns 400 if locationId is negative or zero', async () => {
    const request = new Request('http://localhost/api/locations/0/image');
    const response = await GET(request, { params: Promise.resolve({ locationId: '0' }) });

    expect(response.status).toBe(400);
  });

  it('returns location image data on success', async () => {
    jest.mocked(getOrGenerateLocationImage).mockResolvedValueOnce({
      url: 'https://blob.vercel-storage.com/image-1.png',
      cached: true,
    });

    const request = new Request('http://localhost/api/locations/1/image');
    const response = await GET(request, { params: Promise.resolve({ locationId: '1' }) });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      url: 'https://blob.vercel-storage.com/image-1.png',
      cached: true,
    });
    expect(getOrGenerateLocationImage).toHaveBeenCalledWith(1);
  });

  it('returns 500 when getOrGenerateLocationImage fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.mocked(getOrGenerateLocationImage).mockRejectedValueOnce(new Error('AI rate limited'));

    const request = new Request('http://localhost/api/locations/1/image');
    const response = await GET(request, { params: Promise.resolve({ locationId: '1' }) });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('AI rate limited');
  });
});
