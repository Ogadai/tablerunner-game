import { listSavedGames } from '@/lib/store/saveGameBlobs';
import SavedGames from './saved-games';

export default async function Page({ params }: {
  params: Promise<{ boardId: string; mapId: string }>;
}) {
  const { boardId, mapId } = await params;
  const result = await listSavedGames(boardId, mapId);

  return <SavedGames key={`${boardId}:${mapId}`} boardId={boardId} mapId={mapId} initialResult={result} />;
}
