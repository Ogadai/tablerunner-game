/** @jest-environment node */
import { GET } from "./route";

describe("GET /manifest.webmanifest", () => {
  it("returns the root fullscreen web app manifest by default", async () => {
    const response = await GET(new Request("http://localhost/manifest.webmanifest"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "application/manifest+json; charset=utf-8",
    );
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=0, must-revalidate",
    );

    const manifest = await response.json();
    expect(manifest).toEqual({
      id: "/",
      name: "TableRunner",
      short_name: "TableRunner",
      description: "A game played between a table-top board game and an app",
      start_url: "/",
      scope: "/",
      display: "fullscreen",
      display_override: ["fullscreen", "standalone"],
      background_color: "#120f0d",
      theme_color: "#120f0d",
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
    });
  });

  it("links start_url and id to the current boardId/mapId game page", async () => {
    const response = await GET(
      new Request(
        "http://localhost/manifest.webmanifest?boardId=board-1&mapId=cauldron-of-fire",
      ),
    );
    const manifest = await response.json();

    expect(response.status).toBe(200);
    expect(manifest.id).toBe("/board-1/cauldron-of-fire");
    expect(manifest.start_url).toBe("/board-1/cauldron-of-fire");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("fullscreen");
    expect(manifest.display_override).toEqual(["fullscreen", "standalone"]);
  });

  it("URL-encodes special characters in boardId and mapId", async () => {
    const response = await GET(
      new Request(
        "http://localhost/manifest.webmanifest?boardId=board%201&mapId=map%232",
      ),
    );
    const manifest = await response.json();

    expect(manifest.start_url).toBe("/board%201/map%232");
    expect(manifest.id).toBe("/board%201/map%232");
  });

  it.each([
    "?boardId=board-1",
    "?mapId=map-2",
    "?boardId=&mapId=map-2",
    "?boardId=.&mapId=map-2",
    "?boardId=board-1&mapId=.",
    "?boardId=../admin&mapId=map-2",
    "?boardId=board-1&mapId=a/b",
  ])("falls back to root start_url for incomplete or unsafe params: %s", async (query) => {
    const response = await GET(
      new Request(`http://localhost/manifest.webmanifest${query}`),
    );
    const manifest = await response.json();

    expect(response.status).toBe(200);
    expect(manifest.start_url).toBe("/");
    expect(manifest.id).toBe("/");
  });
});
