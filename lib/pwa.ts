import type { MetadataRoute } from "next";

export const APP_NAME = "TableRunner";
export const APP_DESCRIPTION =
  "A game played between a table-top board game and an app";
export const THEME_COLOR_LIGHT = "#f2ebd9";
export const THEME_COLOR_DARK = "#120f0d";

const INVALID_SEGMENT_PATTERN = /[\\/\0]|\.\./;

function sanitizeRouteSegment(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed === "." || INVALID_SEGMENT_PATTERN.test(value)) {
    return null;
  }
  return value;
}

export function getManifestHref(boardId?: string, mapId?: string): string {
  const safeBoardId = sanitizeRouteSegment(boardId);
  const safeMapId = sanitizeRouteSegment(mapId);

  if (!safeBoardId || !safeMapId) {
    return "/manifest.webmanifest";
  }

  const params = new URLSearchParams({
    boardId: safeBoardId,
    mapId: safeMapId,
  });

  return `/manifest.webmanifest?${params.toString()}`;
}

export function buildWebAppManifest(
  boardId?: string | null,
  mapId?: string | null,
): MetadataRoute.Manifest {
  const safeBoardId = sanitizeRouteSegment(boardId);
  const safeMapId = sanitizeRouteSegment(mapId);
  const startUrl =
    safeBoardId && safeMapId
      ? `/${encodeURIComponent(safeBoardId)}/${encodeURIComponent(safeMapId)}`
      : "/";

  return {
    id: startUrl,
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    start_url: startUrl,
    scope: "/",
    display: "fullscreen",
    display_override: ["fullscreen", "standalone"],
    background_color: THEME_COLOR_DARK,
    theme_color: THEME_COLOR_DARK,
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
