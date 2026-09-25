import { getPlayerMessages } from './playerMessages';
import { getPlayerMessagesFromRedis } from './redis-access';

jest.mock('./redis-access', () => ({ getPlayerMessagesFromRedis: jest.fn() }));
beforeEach(() => jest.resetAllMocks());

it.each([{ messages: [] }, { messages: [{ text: 'First' }, { text: 'Second' }] }])('returns messages in stored order', async ({ messages }) => {
  jest.mocked(getPlayerMessagesFromRedis).mockResolvedValue({ messages });
  await expect(getPlayerMessages('board', 'map', 'hero')).resolves.toEqual({ success: true, data: { messages } });
  expect(getPlayerMessagesFromRedis).toHaveBeenCalledWith('board', 'map', 'hero');
});

it('reports storage failure', async () => {
  jest.mocked(getPlayerMessagesFromRedis).mockRejectedValue(new Error('Read failed'));
  await expect(getPlayerMessages('board', 'map', 'hero')).resolves.toEqual({ success: false, error: 'Read failed' });
});
