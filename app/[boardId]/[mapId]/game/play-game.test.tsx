import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

import PlayGame from "./play-game";

jest.mock("@/lib/store/gameState", () => ({
  deleteGameState: jest.fn(),
}));

describe("PlayGame", () => {
  it("renders the game name", () => {
    render(<PlayGame boardId="board-1" mapId="map-2" name="Test Game" />);

    expect(screen.getByText("Playing game: Test Game")).toBeInTheDocument();
  });
});