import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { useParams } from "next/navigation";

import Page from "./page";
import { getGameState } from "@/lib/store/gameState";
import GameTopicService from "../../message-bus/game-topic-service";

jest.mock("next/navigation", () => ({
  useParams: jest.fn(),
}));

jest.mock("@/lib/store/gameState", () => ({
  getGameState: jest.fn(),
}));

jest.mock("@/lib/message-types", () => ({
  getGameTopicId: jest.fn((boardId: string, mapId: string) => `${boardId}-${mapId}`),
}));

jest.mock("../../message-bus/game-topic-service", () => ({
  __esModule: true,
  default: { subscribe: jest.fn() },
}));

jest.mock("./create-game", () => ({
  __esModule: true,
  default: ({ boardId, mapId }: { boardId: string; mapId: string }) => (
    <div>Create game for {boardId}/{mapId}</div>
  ),
}));

jest.mock("./play-game", () => ({
  __esModule: true,
  default: ({ name }: { name: string }) => <div>Playing {name}</div>,
}));

jest.mock("../../error", () => ({
  __esModule: true,
  default: ({ error }: { error: Error }) => <div>Error: {error.message}</div>,
}));

describe("Route Page", () => {
  let stateListener: (() => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({ boardId: "board-1", mapId: "map-2" });
    (GameTopicService.subscribe as jest.Mock).mockImplementation(
      (_topicId: string, listener: () => void) => {
        stateListener = listener;
        return jest.fn();
      },
    );
  });

  it("shows loading while game state is being fetched", () => {
    (getGameState as jest.Mock).mockReturnValue(new Promise(() => {}));

    render(<Page />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders CreateGame when no game exists", async () => {
    (getGameState as jest.Mock).mockResolvedValue({ success: true });

    render(<Page />);

    expect(await screen.findByText("Create game for board-1/map-2")).toBeInTheDocument();
    expect(GameTopicService.subscribe).toHaveBeenCalledWith("board-1-map-2", expect.any(Function));
  });

  it("renders PlayGame for an existing game", async () => {
    (getGameState as jest.Mock).mockResolvedValue({
      success: true,
      data: { name: "Test Game" },
    });

    render(<Page />);

    expect(await screen.findByText("Playing Test Game")).toBeInTheDocument();
    expect(getGameState).toHaveBeenCalledWith("board-1", "map-2");
  });

  it("renders the error component when fetching fails", async () => {
    (getGameState as jest.Mock).mockResolvedValue({
      success: false,
      error: "Unable to load game",
    });

    render(<Page />);

    expect(await screen.findByText("Error: Unable to load game")).toBeInTheDocument();
  });

  it("refetches game state when the topic reports an update", async () => {
    (getGameState as jest.Mock)
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true, data: { name: "Updated Game" } });

    render(<Page />);
    await waitFor(() => expect(getGameState).toHaveBeenCalledTimes(1));

    stateListener?.();

    expect(await screen.findByText("Playing Updated Game")).toBeInTheDocument();
    expect(getGameState).toHaveBeenCalledTimes(2);
  });
});