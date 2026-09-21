

// app/api/edit/route.ts
import { runGameActionsBetweenTurns } from '@/lib/runner/game-runner';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // 1. Extract the string parameters from the JSON body
    const { boardId, mapId } = await request.json();

    // Quick validation to ensure both are strings
    if (typeof boardId !== 'string' || typeof mapId !== 'string') {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // 1. Try to get your Redis lock here
    await runGameActionsBetweenTurns(boardId, mapId);

    // 2. Perform edit logic
    return NextResponse.json({ success: true });
  } catch (error) {
    // If your Redis lock throws 'Failed to acquire lock', catch it here:
    return NextResponse.json({ error: 'Parallel edit blocked' }, { status: 423 });
  }
}
