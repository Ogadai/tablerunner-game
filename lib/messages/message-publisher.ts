import { GameTopicMessageBase, getGameTopicId } from "../message-types";

const getGameTopic = (boardId: string, mapId: string) => `game:${getGameTopicId(boardId, mapId)}`;

export async function publishMessage(boardId: string, mapId: string, body: GameTopicMessageBase): Promise<void> {
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    throw new Error('ABLY_API_KEY is not configured');
  }

  const response = await fetch(
    `https://rest.ably.io/channels/${encodeURIComponent(getGameTopic(boardId, mapId))}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(apiKey).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: body.type,
        data: body,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to publish game state update: ${response.status}`);
  }
}
