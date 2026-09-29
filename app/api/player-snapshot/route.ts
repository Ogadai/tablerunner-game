import { getPlayerSnapshotFromRedis } from '@/lib/store/redis-access';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const boardId = params.get('boardId');
  const mapId = params.get('mapId');
  const playerId = params.get('playerId');
  const headers = { 'Cache-Control': 'no-store' };

  if (!boardId || !mapId || !playerId) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400, headers });
  }

  try {
    const snapshot = await getPlayerSnapshotFromRedis(boardId, mapId, playerId);
    return NextResponse.json(snapshot, { headers });
  } catch (error) {
    console.error('Unable to load player snapshot', error);
    return NextResponse.json({ error: 'Unable to load player snapshot' }, { status: 500, headers });
  }
}
