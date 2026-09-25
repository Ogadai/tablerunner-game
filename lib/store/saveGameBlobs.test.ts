/** @jest-environment node */
import { get, list, put, type ListBlobResultBlob } from '@vercel/blob';
import { listSavedGames, loadGameFromBlob, saveGameToBlob } from './saveGameBlobs';
import { getGameSnapshotFromRedis, restoreGameSnapshotInRedis } from './redis-blob-saves';
import { createSave } from './test-support/fixtures';

jest.mock('@vercel/blob', () => ({ get: jest.fn(), list: jest.fn(), put: jest.fn() }));
jest.mock('./redis-blob-saves', () => ({ getGameSnapshotFromRedis: jest.fn(), restoreGameSnapshotInRedis: jest.fn() }));
const uuid = '12345678-1234-4234-8234-123456789abc';
const pathname = `saved-games/board/map/${uuid}_players-1_turn-3_name-My%20save.json`;

function serve(body: unknown) {
  // Use an actual response stream so JSON parsing is exercised too.
  jest.mocked(get).mockResolvedValue({ statusCode: 200, stream: new Response(JSON.stringify(body)).body } as Awaited<ReturnType<typeof get>>);
}

function blob(path: string, time: string): ListBlobResultBlob {
  return { pathname: path, uploadedAt: new Date(time), size: 100, etag: 'test-etag', url: `https://example.test/${path}`, downloadUrl: `https://example.test/${path}` };
}

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(crypto, 'randomUUID').mockReturnValue(uuid);
  jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'nextTick'] }).setSystemTime(new Date('2026-09-25T12:00:00.000Z'));
  const save = createSave();
  jest.mocked(getGameSnapshotFromRedis).mockResolvedValue({ gameState: save.redisState['game:board:map'], redisState: save.redisState });
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

describe('saving', () => {
  it('writes a versioned snapshot with trimmed metadata and a unique, non-overwriting pathname', async () => {
    await expect(saveGameToBlob('board', 'map', '  My save  ')).resolves.toEqual({ success: true });
    expect(getGameSnapshotFromRedis).toHaveBeenCalledWith('board', 'map');
    expect(put).toHaveBeenCalledWith(pathname, JSON.stringify(createSave()), {
      access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: false,
    });
  });

  it('encodes scope and save-name path separators', async () => {
    await saveGameToBlob('board /', 'map %', '雪 / save');
    expect(jest.mocked(put).mock.calls[0][0]).toBe(`saved-games/board%20%2F/map%20%25/${uuid}_players-1_turn-3_name-%E9%9B%AA%20%2F%20save.json`);
  });

  it.each(['', '   '])('rejects blank names before reading state', async name => {
    await expect(saveGameToBlob('board', 'map', name)).resolves.toEqual({ success: false, error: 'Board ID, map ID and save name are required' });
    expect(getGameSnapshotFromRedis).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  it.each([getGameSnapshotFromRedis, put])('reports save dependency failures', async dependency => {
    jest.mocked(dependency).mockRejectedValue(new Error('Save failed'));
    await expect(saveGameToBlob('board', 'map', 'My save')).resolves.toEqual({ success: false, error: 'Save failed' });
    if (dependency === getGameSnapshotFromRedis) expect(put).not.toHaveBeenCalled();
  });
});

describe('listing', () => {
  it('collects Blob pages before sorting newest first and applying the application cursor', async () => {
    const blobs = Array.from({ length: 22 }, (_, index) => blob(
      pathname.replace('_turn-3_', `_turn-${index}_`), `2026-09-${String(index + 1).padStart(2, '0')}T12:00:00Z`,
    ));
    jest.mocked(list).mockResolvedValueOnce({ blobs: blobs.slice(0, 10), cursor: 'blob-next', hasMore: true })
      .mockResolvedValueOnce({ blobs: blobs.slice(10), hasMore: false });
    const result = await listSavedGames('board', 'map');
    expect(result.success).toBe(true);
    expect(result.data!.games.map(game => game.turn)).toEqual(Array.from({ length: 20 }, (_, index) => 21 - index));
    expect(result.data).toMatchObject({ cursor: '20', hasMore: true });
    expect(list).toHaveBeenNthCalledWith(1, { prefix: 'saved-games/board/map/', cursor: undefined, limit: 1000 });
    expect(list).toHaveBeenNthCalledWith(2, { prefix: 'saved-games/board/map/', cursor: 'blob-next', limit: 1000 });
    jest.mocked(list).mockResolvedValue({ blobs, hasMore: false });
    const lastPage = await listSavedGames('board', 'map', '20');
    expect(lastPage.data!.games.map(game => game.turn)).toEqual([1, 0]);
    expect(lastPage.data).toMatchObject({ cursor: undefined, hasMore: false });
    expect(get).not.toHaveBeenCalled();
  });

  it('supports legacy filenames and sorts equal timestamps by pathname', async () => {
    const legacy = pathname.replace('_name-My%20save', '');
    jest.mocked(list).mockResolvedValue({ blobs: [blob(pathname, '2026-09-25'), blob(legacy, '2026-09-25')], hasMore: false });
    const result = await listSavedGames('board', 'map');
    expect(result.data!.games.map(game => game.pathname)).toEqual([legacy, pathname].sort((a, b) => a.localeCompare(b)));
    expect(result.data!.games.find(game => game.pathname === legacy)).toMatchObject({ saveName: `Saved game ${uuid}`, playerCount: 1, turn: 3 });
    expect(result.data!.games.find(game => game.pathname === pathname)).toMatchObject({ saveName: 'My save', savedAt: '2026-09-25T00:00:00.000Z' });
  });

  it.each([undefined, '40'])('returns an empty page when no saves remain (cursor %s)', async cursor => {
    jest.mocked(list).mockResolvedValue({ blobs: [], hasMore: false });
    await expect(listSavedGames('board', 'map', cursor)).resolves.toEqual({ success: true, data: { games: [], cursor: undefined, hasMore: false } });
  });

  it.each(['-1', '1.5', 'abc', '', '9007199254740992'])('rejects invalid cursor %s without querying Blob', async cursor => {
    await expect(listSavedGames('board', 'map', cursor)).resolves.toEqual({ success: false, error: 'Invalid saved game cursor' });
    expect(list).not.toHaveBeenCalled();
  });

  it('reports listing failures', async () => {
    jest.mocked(list).mockRejectedValue(new Error('List failed'));
    await expect(listSavedGames('board', 'map')).resolves.toEqual({ success: false, error: 'List failed' });
  });
});

describe('loading', () => {
  it.each([pathname, pathname.replace('_name-My%20save', '')])('validates and restores a current or legacy save: %s', async path => {
    const save = createSave();
    serve(save);
    await expect(loadGameFromBlob('board', 'map', path)).resolves.toEqual({ success: true });
    expect(get).toHaveBeenCalledWith(path.replace('%20', '%2520'), { access: 'public' });
    expect(restoreGameSnapshotInRedis).toHaveBeenCalledWith('board', 'map', save.redisState);
  });

  it.each([
    pathname.replace('/board/', '/other/'), pathname.replace('/map/', '/map2/'), `${pathname}/extra`,
    pathname.replace('players-1', 'players-9007199254740992'), pathname.replace('My%20save', '%20'),
    pathname.replace('My%20save', '%4dy%20save'), pathname.replace('My%20save', '../escape'),
  ])('rejects invalid or out-of-scope pathname %s before fetching', async path => {
    const result = await loadGameFromBlob('board', 'map', path);
    expect(result.success).toBe(false);
    expect(get).not.toHaveBeenCalled();
    expect(restoreGameSnapshotInRedis).not.toHaveBeenCalled();
  });

  it.each([null, { statusCode: 304 }])('rejects unavailable Blob responses %j', async response => {
    jest.mocked(get).mockResolvedValue(response as Awaited<ReturnType<typeof get>>);
    await expect(loadGameFromBlob('board', 'map', pathname)).resolves.toEqual({ success: false, error: 'Saved game could not be found or read' });
    expect(restoreGameSnapshotInRedis).not.toHaveBeenCalled();
  });

  it.each([
    ['boardId', 'other'], ['mapId', 'other'], ['id', '12345678-1234-4234-8234-123456789abd'],
    ['playerCount', 2], ['turn', 4], ['saveName', 'Other name'],
  ])('rejects metadata inconsistent with the pathname: %s', async (field, value) => {
    const save = createSave();
    serve({ ...save, metadata: { ...save.metadata, [field]: value } });
    await expect(loadGameFromBlob('board', 'map', pathname)).resolves.toEqual({ success: false, error: 'Saved game metadata does not match its pathname' });
    expect(restoreGameSnapshotInRedis).not.toHaveBeenCalled();
  });

  it.each([
    ['gameId', 'other'], ['turn', 4], ['players', []], ['characters', null], ['npcs', null],
    ['visited', null], ['stores', null], ['portals', null], ['visitedPortals', null],
    ['leds', null], ['counters', null], ['processState', null], ['name', 1],
  ])('rejects invalid game state: %s', async (field, value) => {
    const save = createSave();
    serve({ ...save, redisState: { 'game:board:map': { ...save.redisState['game:board:map'], [field]: value } } });
    await expect(loadGameFromBlob('board', 'map', pathname)).resolves.toEqual({ success: false, error: 'Saved game contains invalid game state' });
    expect(restoreGameSnapshotInRedis).not.toHaveBeenCalled();
  });

  it('rejects unsupported schemas without restoring', async () => {
    serve({ ...createSave(), schemaVersion: 2 });
    expect((await loadGameFromBlob('board', 'map', pathname)).success).toBe(false);
    expect(restoreGameSnapshotInRedis).not.toHaveBeenCalled();
  });

  it('rejects a save without its scoped game state', async () => {
    serve({ ...createSave(), redisState: {} });
    await expect(loadGameFromBlob('board', 'map', pathname)).resolves.toEqual({ success: false, error: 'Saved game contains invalid game state' });
    expect(restoreGameSnapshotInRedis).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON without restoring', async () => {
    jest.mocked(get).mockResolvedValue({ statusCode: 200, stream: new Response('{invalid').body } as Awaited<ReturnType<typeof get>>);
    expect((await loadGameFromBlob('board', 'map', pathname)).success).toBe(false);
    expect(restoreGameSnapshotInRedis).not.toHaveBeenCalled();
  });

  it('reports fetch and restore failures', async () => {
    jest.mocked(get).mockRejectedValue(new Error('Fetch failed'));
    await expect(loadGameFromBlob('board', 'map', pathname)).resolves.toEqual({ success: false, error: 'Fetch failed' });
    serve(createSave());
    jest.mocked(restoreGameSnapshotInRedis).mockRejectedValue(new Error('Restore failed'));
    await expect(loadGameFromBlob('board', 'map', pathname)).resolves.toEqual({ success: false, error: 'Restore failed' });
  });
});
