/** @jest-environment node */
import { GameTopicMessageType } from '../message-types';
import { publishMessage } from './message-publisher';

const originalApiKey = process.env.ABLY_API_KEY;
const message = { type: GameTopicMessageType.GameStateUpdated };

beforeEach(() => {
  process.env.ABLY_API_KEY = 'test:key';
  jest.spyOn(globalThis, 'fetch');
});

afterEach(() => {
  jest.restoreAllMocks();
  if (originalApiKey === undefined) delete process.env.ABLY_API_KEY;
  else process.env.ABLY_API_KEY = originalApiKey;
});

it('aborts a stalled publication after two seconds', async () => {
  const timeout = jest.spyOn(AbortSignal, 'timeout');
  jest.mocked(fetch).mockImplementation(async (_url, options) => new Promise<Response>((_resolve, reject) => {
    const signal = options!.signal!;
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  }));

  await expect(publishMessage('board', 'map', message)).rejects.toMatchObject({ name: 'TimeoutError' });
  expect(timeout).toHaveBeenCalledWith(2000);
  expect(jest.mocked(fetch).mock.calls[0][1]!.signal!.aborted).toBe(true);
});

it('preserves HTTP failure reporting', async () => {
  jest.mocked(fetch).mockResolvedValue(new Response(null, { status: 503 }));
  await expect(publishMessage('board', 'map', message)).rejects.toThrow('Failed to publish game state update: 503');
});
