import { NextResponse } from 'next/server';
import { getOrGenerateLocationImage } from '@/lib/services/location-images';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ locationId: string }> }
) {
  const { locationId } = await context.params;
  const id = parseInt(locationId, 10);

  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 });
  }

  try {
    const result = await getOrGenerateLocationImage(id);
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error(`Error retrieving image for location ${locationId}:`, error);
    return NextResponse.json(
      { error: error?.message || 'Failed to get or generate location image' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  }
}

