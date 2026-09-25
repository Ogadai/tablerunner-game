

import { runGameActionsBetweenTurns } from '@/lib/runner/game-runner';
import { RedisLockError } from '@/lib/store/redis-access';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { boardId, mapId } = await request.json();

    // Quick validation to ensure both are strings
    if (typeof boardId !== 'string' || typeof mapId !== 'string') {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    await runGameActionsBetweenTurns(boardId, mapId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof RedisLockError) {
      return NextResponse.json({ error: 'Parallel edit blocked' }, { status: 423 });
    }
    console.error('Between-turn processing failed', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
