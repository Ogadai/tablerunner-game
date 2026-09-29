import type { PlayerSnapshot } from '@/lib/store/types';

export async function fetchPlayerSnapshot(
  boardId: string, mapId: string, playerId: string, signal: AbortSignal,
): Promise<PlayerSnapshot> {
  const query = new URLSearchParams({ boardId, mapId, playerId });
  const response = await fetch(`/api/player-snapshot?${query}`, { cache: 'no-store', signal });
  if (!response.ok) {
    throw new Error(`Unable to load player snapshot: ${response.status}`);
  }
  return await response.json();
}
