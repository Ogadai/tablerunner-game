import { z } from 'zod';

export const savedGameSchema = z.object({
  schemaVersion: z.literal(1),
  metadata: z.object({
    id: z.uuid(),
    boardId: z.string(),
    mapId: z.string(),
    saveName: z.string().min(1),
    savedAt: z.iso.datetime(),
    gameId: z.string(),
    playerCount: z.number().int().nonnegative(),
    turn: z.number().int().nonnegative(),
  }),
  redisState: z.record(z.string(), z.record(z.string(), z.unknown())),
});

export type SavedGameMetadata = z.infer<typeof savedGameSchema>['metadata'];

export interface SavedGameListEntry extends Omit<SavedGameMetadata, 'gameId'> {
  pathname: string;
}

export interface SavedGameList {
  games: SavedGameListEntry[];
  cursor?: string;
  hasMore: boolean;
}

export function validateGameScope(boardId: string, mapId: string): void {
  if (typeof boardId !== 'string' || typeof mapId !== 'string' ||
      !boardId.trim() || !mapId.trim() || boardId.includes(':') || mapId.includes(':')) {
    throw new Error('A valid board ID and map ID are required');
  }
}
