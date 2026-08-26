import { createNewGameState, deleteGameState, getGameState } from "./gameState";
import { Redis } from "@upstash/redis";

jest.mock("@upstash/redis", () => ({
  Redis: (() => {
    const redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    return { fromEnv: jest.fn(() => redis) };
  })(),
}));

const mockRedis = Redis.fromEnv() as unknown as {
  get: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
};

describe("gameState", () => {
  const fetchMock = jest.fn();
  const originalApiKey = process.env.ABLY_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ABLY_API_KEY = "test-ably-key";
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock;
  });

  afterAll(() => {
    if (originalApiKey === undefined) {
      delete process.env.ABLY_API_KEY;
    } else {
      process.env.ABLY_API_KEY = originalApiKey;
    }
  });

  describe("getGameState", () => {
    it("returns the state stored for a board and map", async () => {
      const state = { name: "Test Game" };
      mockRedis.get.mockResolvedValue(state);

      await expect(getGameState("board-1", "map-2")).resolves.toEqual({
        success: true,
        data: state,
      });
      expect(mockRedis.get).toHaveBeenCalledWith("game:board-1:map-2");
    });

    it("returns a failure when Redis cannot be read", async () => {
      mockRedis.get.mockRejectedValue(new Error("Redis unavailable"));

      await expect(getGameState("board-1", "map-2")).resolves.toEqual({
        success: false,
        error: "Redis unavailable",
      });
    });
  });

  describe("createNewGameState", () => {
    beforeEach(() => {
      mockRedis.get.mockResolvedValue(null);
    });

    it("stores and publishes the new game state", async () => {
      mockRedis.set.mockResolvedValue("OK");

      await expect(createNewGameState("board-1", "map-2", "cauldronfire")).resolves.toEqual({
        success: true,
        data: expect.objectContaining({ name: "cauldronfire on board board-1 and map map-2" }),
      });
      expect(mockRedis.set).toHaveBeenCalledWith(
        "game:board-1:map-2",
        expect.objectContaining({ name: "cauldronfire on board board-1 and map map-2" }),
        { ex: 60 * 60 * 24 * 7 },
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "https://rest.ably.io/channels/game%3Aboard-1-map-2/messages",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
        }),
      );
    });

    it("returns a failure when storing the state fails", async () => {
      mockRedis.set.mockRejectedValue(new Error("Redis unavailable"));

      await expect(createNewGameState("board-1", "map-2", "cauldronfire")).resolves.toEqual({
        success: false,
        error: "Redis unavailable",
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("returns a failure when publishing the update fails", async () => {
      mockRedis.set.mockResolvedValue("OK");
      fetchMock.mockResolvedValue({ ok: false, status: 503 });

      await expect(createNewGameState("board-1", "map-2", "cauldronfire")).resolves.toEqual({
        success: false,
        error: "Failed to publish game state update: 503",
      });
    });
  });

  describe("deleteGameState", () => {
    it("deletes and publishes the game state update", async () => {
      mockRedis.del.mockResolvedValue(1);

      await expect(deleteGameState("board-1", "map-2")).resolves.toEqual({ success: true });
      expect(mockRedis.del).toHaveBeenCalledWith("game:board-1:map-2");
      expect(fetchMock).toHaveBeenCalled();
    });

    it("returns a failure when deleting the state fails", async () => {
      mockRedis.del.mockRejectedValue(new Error("Redis unavailable"));

      await expect(deleteGameState("board-1", "map-2")).resolves.toEqual({
        success: false,
        error: "Redis unavailable",
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});