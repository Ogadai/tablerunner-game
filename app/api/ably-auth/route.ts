import { NextResponse } from 'next/server';
import * as Ably from 'ably';

export async function POST(request: Request) {
  try {
    const { playerId } = await request.json();

    // Fallback or validation if the client failed to provide an ID
    if (!playerId) {
      return NextResponse.json({ error: 'Missing client ID' }, { status: 400 });
    }

    // Initialize Ably Rest with your private API key
    const client = new Ably.Rest(process.env.ABLY_API_KEY!);
    
    // Create a signed token request using the client's custom GUID as the clientId
    const tokenData = await client.auth.createTokenRequest({
      clientId: playerId, 
    });
    
    return NextResponse.json(tokenData);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
