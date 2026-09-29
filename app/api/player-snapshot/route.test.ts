/** @jest-environment node */
import { getPlayerSnapshotFromRedis } from '@/lib/store/redis-access';
import { makePlayerSnapshot } from '@/app/[boardId]/[mapId]/game/test-fixtures';
import { GET } from './route';

jest.mock('@/lib/store/redis-access', () => ({ getPlayerSnapshotFromRedis: jest.fn() }));

afterEach(() => jest.restoreAllMocks());

it('returns an uncached player snapshot', async () => {
  const snapshot = makePlayerSnapshot();
  jest.mocked(getPlayerSnapshotFromRedis).mockResolvedValue(snapshot);
  const response = await GET(new Request('http://localhost/api/player-snapshot?boardId=board&mapId=map&playerId=warrior'));
  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(await response.json()).toEqual(snapshot);
  expect(getPlayerSnapshotFromRedis).toHaveBeenCalledWith('board', 'map', 'warrior');
});

it.each(['', '?boardId=board&mapId=map', '?boardId=&mapId=map&playerId=warrior'])('rejects incomplete parameters: %s', async query => {
  const response = await GET(new Request(`http://localhost/api/player-snapshot${query}`));
  expect(response.status).toBe(400);
  expect(getPlayerSnapshotFromRedis).not.toHaveBeenCalled();
});

it('reports storage failures without returning a successful empty snapshot', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.mocked(getPlayerSnapshotFromRedis).mockRejectedValue(new Error('Redis unavailable'));
  const response = await GET(new Request('http://localhost/api/player-snapshot?boardId=board&mapId=map&playerId=warrior'));
  expect(response.status).toBe(500);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(await response.json()).toEqual({ error: 'Unable to load player snapshot' });
});
