import { buildWebAppManifest, getManifestHref } from "./pwa";

describe("getManifestHref", () => {
  it("returns the root manifest path when params are omitted or empty", () => {
    expect(getManifestHref()).toBe("/manifest.webmanifest");
    expect(getManifestHref("board-1")).toBe("/manifest.webmanifest");
    expect(getManifestHref("", "map-2")).toBe("/manifest.webmanifest");
    expect(getManifestHref("   ", "map-2")).toBe("/manifest.webmanifest");
  });

  it("encodes valid boardId and mapId query parameters without mutating whitespace", () => {
    expect(getManifestHref("board-1", "map-2")).toBe(
      "/manifest.webmanifest?boardId=board-1&mapId=map-2",
    );
    expect(getManifestHref(" board 1 ", "map#2")).toBe(
      "/manifest.webmanifest?boardId=+board+1+&mapId=map%232",
    );
  });

  it.each([
    [".", "map-2"],
    ["board-1", "."],
    [" . ", "map-2"],
    [".. ", "map-2"],
    ["../admin", "map-2"],
    ["board-1", "a/b"],
    ["board-1", "a\\b"],
    ["board\0id", "map-2"],
  ])(
    "falls back to root manifest path for unsafe segments (%j, %j)",
    (boardId, mapId) => {
      expect(getManifestHref(boardId, mapId)).toBe("/manifest.webmanifest");
    },
  );
});

describe("buildWebAppManifest", () => {
  it("preserves exact decoded segment characters in start_url", () => {
    const manifest = buildWebAppManifest(" board-1", "map-2");
    expect(manifest.start_url).toBe("/%20board-1/map-2");
    expect(manifest.id).toBe("/%20board-1/map-2");
  });

  it("falls back to root start_url for single-dot and control-character segments", () => {
    expect(buildWebAppManifest(".", "map-2").start_url).toBe("/");
    expect(buildWebAppManifest("board-1", ".").start_url).toBe("/");
    expect(buildWebAppManifest("board\0id", "map-2").start_url).toBe("/");
  });
});
