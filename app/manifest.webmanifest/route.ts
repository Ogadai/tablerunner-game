import { buildWebAppManifest } from "@/lib/pwa";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get("boardId");
  const mapId = searchParams.get("mapId");
  const manifest = buildWebAppManifest(boardId, mapId);

  return new Response(JSON.stringify(manifest), {
    status: 200,
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
