import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import CreateGame from "./create-game";
import { getGamesForMap } from "@/lib/games/gameList";
import { createNewGameState } from "@/lib/store/gameState";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
}));

jest.mock("@/lib/games/gameList", () => ({
  getGamesForMap: jest.fn(),
}));

jest.mock("@/lib/store/gameState", () => ({
  createNewGameState: jest.fn(),
}));

describe("CreateGame", () => {
  beforeEach(() => {
    (getGamesForMap as jest.Mock).mockResolvedValue({
      success: true,
      data: [
        {
          id: "game-1",
          name: "Test Game",
          map: "map-2",
          description: "A test game.",
          heroImage: "/hero.png",
        },
      ],
    });
  });

  it("shows a loading state before games are fetched", () => {
    (getGamesForMap as jest.Mock).mockReturnValue(new Promise(() => {}));

    render(<CreateGame boardId="board-1" mapId="map-2" />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders games returned for the map", async () => {
    render(<CreateGame boardId="board-1" mapId="map-2" />);

    expect(await screen.findByRole("heading", { name: "Test Game", level: 4 })).toBeInTheDocument();
    expect(screen.getByText("A test game.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New Game" })).toBeInTheDocument();
    expect(getGamesForMap).toHaveBeenCalledWith("map-2");
  });

  it("creates the selected game when submitted", async () => {
    render(<CreateGame boardId="board-1" mapId="map-2" />);
    const button = await screen.findByRole("button", { name: "New Game" });

    fireEvent.submit(button.closest("form")!);

    await waitFor(() => {
      expect(createNewGameState).toHaveBeenCalledWith("board-1", "map-2", "game-1");
    });
  });
});