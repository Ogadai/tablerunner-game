/** @jest-environment node */

import * as Ably from 'ably';
import { POST } from './route';

jest.mock('ably', () => ({
  Rest: jest.fn(),
}));

const mockCreateTokenRequest = jest.fn();
const MockRest = Ably.Rest as unknown as jest.Mock;

function createRequest(body: unknown): Request {
  return {
    json: async () => body,
  } as Request;
}

describe('POST /api/ably-auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ABLY_API_KEY = 'test-ably-api-key';

    MockRest.mockImplementation(() => ({
      auth: {
        createTokenRequest: mockCreateTokenRequest,
      },
    }));
  });

  it('returns 400 when playerId is missing', async () => {
    const response = await POST(createRequest({}));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'Missing client ID' });
    expect(MockRest).not.toHaveBeenCalled();
  });

  it('returns 400 when playerId is empty', async () => {
    const response = await POST(createRequest({ playerId: '' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'Missing client ID' });
    expect(MockRest).not.toHaveBeenCalled();
  });

  it('creates a token request using the playerId and API key', async () => {
    const tokenRequest = {
      keyName: 'test-key',
      clientId: 'player-123',
      mac: 'signed-token',
      nonce: 'test-nonce',
      timestamp: 123456789,
    };

    mockCreateTokenRequest.mockResolvedValue(tokenRequest);

    const response = await POST(
      createRequest({ playerId: 'player-123' }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(tokenRequest);
    expect(MockRest).toHaveBeenCalledWith('test-ably-api-key');
    expect(mockCreateTokenRequest).toHaveBeenCalledWith({
      clientId: 'player-123',
    });
  });

  it('returns 500 when token generation fails', async () => {
    mockCreateTokenRequest.mockRejectedValue(
      new Error('Ably request failed'),
    );

    const response = await POST(
      createRequest({ playerId: 'player-123' }),
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'Failed to generate token' });
  });

  it('returns 500 when the request body is invalid JSON', async () => {
    const request = new Request('http://localhost/api/ably-auth', {
      method: 'POST',
      body: '{',
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'Failed to generate token' });
  });
});
