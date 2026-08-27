import "@testing-library/jest-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import { useParams } from "next/navigation";

import Page from "./page";
import gameStateSyncService from "./game/game-state-sync-service";

jest.mock("next/navigation", () => ({
  useParams: jest.fn(),
}));

jest.mock("./game/game-state-sync-service", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    set: jest.fn(),
    subscribe: jest.fn(),
    loading: false,
  },
}));

jest.mock("./create-game", () => ({
  __esModule: true,
  default: ({ boardId, mapId }: { boardId: string; mapId: string }) => (
    <div>Create game for {boardId}/{mapId}</div>
  ),
}));

jest.mock("./game/play-game", () => ({
  __esModule: true,
  default: ({ name }: { name: string }) => <div>Playing {name}</div>,
}));

describe("Route Page", () => {
  let stateListener: ((gameState: { name: string } | undefined) => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    (gameStateSyncService as any).loading = false;
    (useParams as jest.Mock).mockReturnValue({ boardId: "board-1", mapId: "map-2" });
    (gameStateSyncService.subscribe as jest.Mock).mockImplementation(
      (_boardId: string, _mapId: string, listener: (gameState: { name: string } | undefined) => void) => {
        stateListener = listener;
        return jest.fn();
      },
    );
  });

  it("shows loading while game state is being fetched", () => {
    (gameStateSyncService as any).loading = true;
    (gameStateSyncService.get as jest.Mock).mockReturnValue(undefined);

    render(<Page />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders CreateGame when no game exists", async () => {
    (gameStateSyncService.get as jest.Mock).mockReturnValue(undefined);

    render(<Page />);

    expect(await screen.findByText("Create game for board-1/map-2")).toBeInTheDocument();
    expect(gameStateSyncService.subscribe).toHaveBeenCalledWith("board-1", "map-2", expect.any(Function));
  });

  it("renders PlayGame for an existing game", async () => {
    (gameStateSyncService.get as jest.Mock).mockReturnValue({ name: "Test Game" });

    render(<Page />);

    expect(await screen.findByText("Playing Test Game")).toBeInTheDocument();
    expect(gameStateSyncService.get).toHaveBeenCalledWith("board-1", "map-2");
    expect(gameStateSyncService.subscribe).toHaveBeenCalledWith("board-1", "map-2", expect.any(Function));
  });

  it("updates the UI when the sync service reports a new game state", async () => {
    (gameStateSyncService.get as jest.Mock).mockReturnValue({ name: "Original Game" });

    render(<Page />);
    await waitFor(() => expect(screen.getByText("Playing Original Game")).toBeInTheDocument());

    await act(async () => {
      stateListener?.({ name: "Updated Game" });
    });

    expect(await screen.findByText("Playing Updated Game")).toBeInTheDocument();
    expect(gameStateSyncService.subscribe).toHaveBeenCalledWith("board-1", "map-2", expect.any(Function));
  });
});