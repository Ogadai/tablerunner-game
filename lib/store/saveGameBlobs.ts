'use server'

import { ApiResponse } from "../api-response";
import { get, list, put } from '@vercel/blob';
import { getGameSnapshotFromRedis, restoreGameSnapshotInRedis } from './redis-blob-saves';
import { savedGameSchema, SavedGameList, validateGameScope } from './savedGameTypes';

function getSavePrefix(boardId: string, mapId: string): string {
  validateGameScope(boardId, mapId);
  return `saved-games/${encodeURIComponent(boardId)}/${encodeURIComponent(mapId)}/`;
}

function getSavePathname(boardId: string, mapId: string, metadata: { id: string; playerCount: number; turn: number; saveName: string }): string {
  return `${getSavePrefix(boardId, mapId)}${metadata.id}_players-${metadata.playerCount}_turn-${metadata.turn}_name-${encodeURIComponent(metadata.saveName)}.json`;
}

function parseSavePathname(boardId: string, mapId: string, pathname: string) {
  const prefix = getSavePrefix(boardId, mapId);
  const match = typeof pathname === 'string' && pathname.startsWith(prefix)
    ? /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_players-(\d+)_turn-(\d+)(?:_name-([^/]+))?\.json$/.exec(pathname.slice(prefix.length))
    : null;
  if (!match) {
    throw new Error('Invalid saved game pathname for this board and map');
  }
  const playerCount = Number(match[2]);
  const turn = Number(match[3]);
  const saveName = match[4] === undefined ? undefined : decodeURIComponent(match[4]);
  if (!Number.isSafeInteger(playerCount) || !Number.isSafeInteger(turn) ||
      (saveName !== undefined && (!saveName.trim() || encodeURIComponent(saveName) !== match[4]))) {
    throw new Error('Invalid saved game pathname metadata');
  }
  return { id: match[1], playerCount, turn, saveName };
}

async function readSavedGame(boardId: string, mapId: string, pathname: string) {
  const pathMetadata = parseSavePathname(boardId, mapId, pathname);
  const blob = await get(pathname, { access: 'private' });
  if (!blob || blob.statusCode !== 200) {
    throw new Error('Saved game could not be found or read');
  }
  const snapshot = savedGameSchema.parse(await new Response(blob.stream).json());
  const { metadata, redisState } = snapshot;
  if (metadata.boardId !== boardId || metadata.mapId !== mapId ||
      metadata.id !== pathMetadata.id || metadata.playerCount !== pathMetadata.playerCount ||
      metadata.turn !== pathMetadata.turn ||
      (pathMetadata.saveName !== undefined && metadata.saveName !== pathMetadata.saveName)) {
    throw new Error('Saved game metadata does not match its pathname');
  }
  const game = redisState[`game:${boardId}:${mapId}`];
  if (!game || game.gameId !== metadata.gameId || game.turn !== metadata.turn ||
      !Array.isArray(game.players) || game.players.length !== metadata.playerCount ||
      !Array.isArray(game.characters) || !Array.isArray(game.npcs) ||
      !Array.isArray(game.visited) || !Array.isArray(game.stores) ||
      !Array.isArray(game.portals) || !Array.isArray(game.visitedPortals) ||
      !Array.isArray(game.leds) || !game.counters || !game.processState || typeof game.name !== 'string') {
    throw new Error('Saved game contains invalid game state');
  }
  return snapshot;
}

export async function saveGameToBlob(boardId: string, mapId: string, saveName: string): Promise<ApiResponse<void>> {
  try {
    if (typeof boardId !== 'string' || typeof mapId !== 'string' || typeof saveName !== 'string' || !saveName.trim()) {
      throw new Error('Board ID, map ID and save name are required');
    }

    const { gameState, redisState } = await getGameSnapshotFromRedis(boardId, mapId);
    const metadata = {
      id: crypto.randomUUID(),
      boardId,
      mapId,
      saveName: saveName.trim(),
      savedAt: new Date().toISOString(),
      gameId: gameState.gameId,
      playerCount: gameState.players.length,
      turn: gameState.turn,
    };
    const pathname = getSavePathname(boardId, mapId, metadata);
    await put(pathname, JSON.stringify({ schemaVersion: 1, metadata, redisState }), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: false,
    });

    return {
      success: true
    };
  } catch (error) {
    console.log('Failed to save game', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

/** Returns a page in Blob pathname order. Pass the returned cursor for the next page. */
export async function listSavedGames(boardId: string, mapId: string, cursor?: string): Promise<ApiResponse<SavedGameList>> {
  try {
    if (cursor !== undefined && typeof cursor !== 'string') {
      throw new Error('Invalid saved game cursor');
    }
    const result = await list({ prefix: getSavePrefix(boardId, mapId), cursor, limit: 20 });
    const games = result.blobs.map(blob => {
      const metadata = parseSavePathname(boardId, mapId, blob.pathname);
      return {
        ...metadata,
        boardId,
        mapId,
        saveName: metadata.saveName ?? `Saved game ${metadata.id}`,
        savedAt: blob.uploadedAt.toISOString(),
        pathname: blob.pathname,
      };
    });
    return { success: true, data: { games, cursor: result.cursor, hasMore: result.hasMore } };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/** Replaces the current game with a save returned by listSavedGames. */
export async function loadGameFromBlob(boardId: string, mapId: string, pathname: string): Promise<ApiResponse<void>> {
  try {
    const snapshot = await readSavedGame(boardId, mapId, pathname);
    await restoreGameSnapshotInRedis(boardId, mapId, snapshot.redisState);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
