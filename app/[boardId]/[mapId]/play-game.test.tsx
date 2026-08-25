import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import PlayGame from "./play-game";
import { deleteGameState } from "@/lib/store/gameState";

jest.mock("@/lib/store/gameState", () => ({
  deleteGameState: jest.fn(),
}));

describe("PlayGame", () => {
  it("renders the game name", () => {
    render(<PlayGame boardId="board-1" mapId="map-2" name="Test Game" />);

    expect(screen.getByText("Playing game: Test Game")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Game" })).toBeInTheDocument();
  });

  it("deletes the game when the form is submitted", async () => {
    render(<PlayGame boardId="board-1" mapId="map-2" name="Test Game" />);

    fireEvent.submit(screen.getByRole("button", { name: "Delete Game" }).closest("form")!);

    await waitFor(() => {
      expect(deleteGameState).toHaveBeenCalledWith("board-1", "map-2");
    });
  });
});