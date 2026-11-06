/** @jest-environment node */
import { uploadToR2, downloadFromR2, listObjectsFromR2, type R2StorageItem } from '@/lib/services/r2-storage';
import { listSavedGames, loadGameFromBlob, saveGameToBlob } from './saveGameBlobs';
import {
  getGameSnapshotFromRedis,
  restoreGameSnapshotInRedis,
  getSavedGamesCacheFromRedis,
  setSavedGamesCacheInRedis,
  invalidateSavedGamesCacheInRedis,
} from './redis-blob-saves';
import { createSave } from './test-support/fixtures';

jest.mock('@/lib/services/r2-storage', () => ({
  uploadToR2: jest.fn(),
  downloadFromR2: jest.fn(),
  listObjectsFromR2: jest.fn(),
}));

jest.mock('./redis-blob-saves', () => ({
  getGameSnapshotFromRedis: jest.fn(),
  restoreGameSnapshotInRedis: jest.fn(),
  getSavedGamesCacheFromRedis: jest.fn(),
  setSavedGamesCacheInRedis: jest.fn(),
  invalidateSavedGamesCacheInRedis: jest.fn(),
}));

const uuid = '12345678-1234-4234-8234-123456789abc';
const pathname = `saved-games/board/map/${uuid}_players-1_turn-3_name-My%20save.json`;

function serve(body: unknown) {
  jest.mocked(downloadFromR2).mockResolvedValue(Buffer.from(JSON.stringify(body)));
}

function blob(path: string, time: string): R2StorageItem {
  return { pathname: path, uploadedAt: new Date(time), size: 100, etag: 'test-etag' };
}

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(crypto, 'randomUUID').mockReturnValue(uuid);
  jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'nextTick'] }).setSystemTime(new Date('2026-09-25T12:00:00.000Z'));
  const save = createSave();
  jest.mocked(getGameSnapshotFromRedis).mockResolvedValue({ gameState: save.redisState['game:board:map'], redisState: save.redisState });
  jest.mocked(getSavedGamesCacheFromRedis).mockResolvedValue(null);
  jest.mocked(setSavedGamesCacheInRedis).mockResolvedValue();
  jest.mocked(invalidateSavedGamesCacheInRedis).mockResolvedValue();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('saving', () => {
  it('writes a versioned snapshot with trimmed metadata and a unique pathname to Cloudflare R2', async () => {
    await expect(saveGameToBlob('board', 'map', '  My save  ')).resolves.toEqual({ success: true });
    expect(getGameSnapshotFromRedis).toHaveBeenCalledWith('board', 'map');
    expect(uploadToR2).toHaveBeenCalledWith(pathname, JSON.stringify(createSave()), {
      contentType: 'application/json',
    });
    expect(invalidateSavedGamesCacheInRedis).toHaveBeenCalledWith('board', 'map');
  });

  it('encodes scope and save-name path separators', async () => {
    await saveGameToBlob('board /', 'map %', '雪 / save');
    expect(jest.mocked(uploadToR2).mock.calls[0][0]).toBe(`saved-games/board%20%2F/map%20%25/${uuid}_players-1_turn-3_name-%E9%9B%AA%20%2F%20save.json`);
    expect(invalidateSavedGamesCacheInRedis).toHaveBeenCalledWith('board /', 'map %');
  });

  it.each(['', '   '])('rejects blank names before reading state', async name => {
    await expect(saveGameToBlob('board', 'map', name)).resolves.toEqual({ success: false, error: 'Board ID, map ID and save name are required' });
    expect(getGameSnapshotFromRedis).not.toHaveBeenCalled();
    expect(uploadToR2).not.toHaveBeenCalled();
    expect(invalidateSavedGamesCacheInRedis).not.toHaveBeenCalled();
  });

  it.each([getGameSnapshotFromRedis, uploadToR2, invalidateSavedGamesCacheInRedis])('reports save dependency failures', async dependency => {
    jest.mocked(dependency).mockRejectedValue(new Error('Save failed'));
    await expect(saveGameToBlob('board', 'map', 'My save')).resolves.toEqual({ success: false, error: 'Save failed' });
    if (dependency === getGameSnapshotFromRedis) expect(uploadToR2).not.toHaveBeenCalled();
    if (dependency !== invalidateSavedGamesCacheInRedis) expect(invalidateSavedGamesCacheInRedis).not.toHaveBeenCalled();
  });
});

describe('listing', () => {
  it('collects R2 objects and caches in Redis before applying pagination', async () => {
    const blobs = Array.from({ length: 22 }, (_, index) => blob(
      pathname.replace('_turn-3_', `_turn-${index}_`), `2026-09-${String(index + 1).padStart(2, '0')}T12:00:00Z`,
    ));
    jest.mocked(listObjectsFromR2).mockResolvedValueOnce(blobs);

    const result = await listSavedGames('board', 'map');
    expect(result.success).toBe(true);
    expect(result.data!.games.map(game => game.turn)).toEqual(Array.from({ length: 20 }, (_, index) => 21 - index));
    expect(result.data).toMatchObject({ cursor: '20', hasMore: true });
    expect(listObjectsFromR2).toHaveBeenCalledWith('saved-games/board/map/');
    expect(setSavedGamesCacheInRedis).toHaveBeenCalledWith('board', 'map', blobs);

    // Subsequent pagination uses Redis cache without querying R2
    jest.mocked(getSavedGamesCacheFromRedis).mockResolvedValueOnce(blobs);
    const lastPage = await listSavedGames('board', 'map', '20');
    expect(lastPage.data!.games.map(game => game.turn)).toEqual([1, 0]);
    expect(lastPage.data).toMatchObject({ cursor: undefined, hasMore: false });
    expect(listObjectsFromR2).toHaveBeenCalledTimes(1);
    expect(downloadFromR2).not.toHaveBeenCalled();
  });

  it('supports legacy filenames and sorts equal timestamps by pathname', async () => {
    const legacy = pathname.replace('_name-My%20save', '');
    jest.mocked(listObjectsFromR2).mockResolvedValue([blob(pathname, '2026-09-25'), blob(legacy, '2026-09-25')]);
    const result = await listSavedGames('board', 'map');
    expect(result.data!.games.map(game => game.pathname)).toEqual([legacy, pathname].sort((a, b) => a.localeCompare(b)));
    expect(result.data!.games.find(game => game.pathname === legacy)).toMatchObject({ saveName: `Saved game ${uuid}`, playerCount: 1, turn: 3 });
    expect(result.data!.games.find(game => game.pathname === pathname)).toMatchObject({ saveName: 'My save', savedAt: '2026-09-25T00:00:00.000Z' });
  });

  it.each([undefined, '40'])('returns an empty page when no saves remain (cursor %s)', async cursor => {
    jest.mocked(listObjectsFromR2).mockResolvedValue([]);
    await expect(listSavedGames('board', 'map', cursor)).resolves.toEqual({ success: true, data: { games: [], cursor: undefined, hasMore: false } });
  });

  it.each(['-1', '1.5', 'abc', '', '9007199254740992'])('rejects invalid cursor %s without querying R2', async cursor => {
    await expect(listSavedGames('board', 'map', cursor)).resolves.toEqual({ success: false, error: 'Invalid saved game cursor' });
    expect(listObjectsFromR2).not.toHaveBeenCalled();
  });

  it('reports listing failures', async () => {
    jest.mocked(listObjectsFromR2).mockRejectedValue(new Error('List failed'));
    await expect(listSavedGames('board', 'map')).resolves.toEqual({ success: false, error: 'List failed' });
  });

  it('returns cached saves from Redis without querying R2 list', async () => {
    const cachedBlobs = [blob(pathname, '2026-09-25T12:00:00Z')];
    jest.mocked(getSavedGamesCacheFromRedis).mockResolvedValue(cachedBlobs);
    const result = await listSavedGames('board', 'map');
    expect(result.success).toBe(true);
    expect(result.data!.games).toHaveLength(1);
    expect(result.data!.games[0]).toMatchObject({ saveName: 'My save', savedAt: '2026-09-25T12:00:00.000Z' });
    expect(getSavedGamesCacheFromRedis).toHaveBeenCalledWith('board', 'map');
    expect(listObjectsFromR2).not.toHaveBeenCalled();
    expect(setSavedGamesCacheInRedis).not.toHaveBeenCalled();
  });

  it('returns cached empty list without querying R2 list', async () => {
    jest.mocked(getSavedGamesCacheFromRedis).mockResolvedValue([]);
    const result = await listSavedGames('board', 'map');
    expect(result).toEqual({ success: true, data: { games: [], cursor: undefined, hasMore: false } });
    expect(getSavedGamesCacheFromRedis).toHaveBeenCalledWith('board', 'map');
    expect(listObjectsFromR2).not.toHaveBeenCalled();
    expect(setSavedGamesCacheInRedis).not.toHaveBeenCalled();
  });

  it.each([getSavedGamesCacheFromRedis, setSavedGamesCacheInRedis])('reports cache dependency failures', async dependency => {
    jest.mocked(listObjectsFromR2).mockResolvedValue([]);
    jest.mocked(dependency).mockRejectedValue(new Error('Cache error'));
    await expect(listSavedGames('board', 'map')).resolves.toEqual({ success: false, error: 'Cache error' });
  });
});

describe('loading', () => {
  it.each([pathname, pathname.replace('_name-My%20save', '')])('validates and restores a current or legacy save: %s', async path => {
    const save = createSave();
    serve(save);
    await expect(loadGameFromBlob('board', 'map', path)).resolves.toEqual({ success: true });
    expect(downloadFromR2).toHaveBeenCalledWith(path);
    expect(restoreGameSnapshotInRedis).toHaveBeenCalledWith('board', 'map', save.redisState);
  });

  it.each([
    pathname.replace('/board/', '/other/'), pathname.replace('/map/', '/map2/'), `${pathname}/extra`,
    pathname.replace('players-1', 'players-9007199254740992'), pathname.replace('My%20save', '%20'),
    pathname.replace('My%20save', '%4dy%20save'), pathname.replace('My%20save', '../escape'),
  ])('rejects invalid or out-of-scope pathname %s before fetching', async path => {
    const result = await loadGameFromBlob('board', 'map', path);
    expect(result.success).toBe(false);
    expect(downloadFromR2).not.toHaveBeenCalled();
    expect(restoreGameSnapshotInRedis).not.toHaveBeenCalled();
  });

  it('rejects unavailable R2 responses', async () => {
    const err = new Error('NoSuchKey');
    err.name = 'NoSuchKey';
    jest.mocked(downloadFromR2).mockRejectedValue(err);
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
    jest.mocked(downloadFromR2).mockResolvedValue(Buffer.from('{invalid'));
    expect((await loadGameFromBlob('board', 'map', pathname)).success).toBe(false);
    expect(restoreGameSnapshotInRedis).not.toHaveBeenCalled();
  });

  it('reports fetch and restore failures', async () => {
    jest.mocked(downloadFromR2).mockRejectedValue(new Error('Fetch failed'));
    await expect(loadGameFromBlob('board', 'map', pathname)).resolves.toEqual({ success: false, error: 'Fetch failed' });
    serve(createSave());
    jest.mocked(restoreGameSnapshotInRedis).mockRejectedValue(new Error('Restore failed'));
    await expect(loadGameFromBlob('board', 'map', pathname)).resolves.toEqual({ success: false, error: 'Restore failed' });
  });
});
