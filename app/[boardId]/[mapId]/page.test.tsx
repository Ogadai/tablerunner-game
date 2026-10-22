import "@testing-library/jest-dom";
import { useLayoutEffect } from 'react';
import { renderToString } from 'react-dom/server';
import { act, render, screen } from "@testing-library/react";
import { useParams } from "next/navigation";

import Page from "./page";
import gameStateSyncService from "./game/game-state-sync-service";
import { makeGameState } from './game/test-fixtures';

jest.mock("next/navigation", () => ({
  useParams: jest.fn(),
}));

jest.mock('./game/game-state-lighting-service', () => ({
  __esModule: true, default: { update: jest.fn() },
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
  beforeEach(() => {
    jest.mocked(useParams).mockReturnValue({ boardId: "board-1", mapId: "map-2" });
    gameStateSyncService.set('board-1', 'map-2', undefined);
  });

  it("shows loading while game state is being fetched", () => {
    jest.mocked(useParams).mockReturnValue({ boardId: 'board-1', mapId: 'unloaded-map' });

    render(<Page />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders CreateGame when no game exists", () => {
    render(<Page />);

    expect(screen.getByText("Create game for board-1/map-2")).toBeInTheDocument();
  });

  it("renders PlayGame for an existing game", () => {
    gameStateSyncService.set('board-1', 'map-2', makeGameState());

    render(<Page />);

    expect(screen.getByText("Playing Test Game")).toBeInTheDocument();
  });

  it("updates the UI when the sync service reports a new game state", () => {
    gameStateSyncService.set('board-1', 'map-2', makeGameState({ name: 'Original Game' }));

    render(<Page />);
    expect(screen.getByText("Playing Original Game")).toBeInTheDocument();

    act(() => gameStateSyncService.set('board-1', 'map-2', makeGameState({ name: 'Updated Game' })));

    expect(screen.getByText("Playing Updated Game")).toBeInTheDocument();
  });

  it('finishes loading when the fetched game is empty', () => {
    jest.mocked(useParams).mockReturnValue({ boardId: 'board-1', mapId: 'empty-map' });
    render(<Page />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    act(() => gameStateSyncService.set('board-1', 'empty-map', undefined));
    expect(screen.getByText('Create game for board-1/empty-map')).toBeInTheDocument();
  });

  it('reads the new game immediately on navigation and ignores updates to the old game', () => {
    gameStateSyncService.set('board-1', 'map-2', makeGameState());
    const { rerender } = render(<Page />);
    jest.mocked(useParams).mockReturnValue({ boardId: 'board-2', mapId: 'map-3' });
    rerender(<Page />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    act(() => gameStateSyncService.set('board-1', 'map-2', undefined));
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    act(() => gameStateSyncService.set('board-2', 'map-3', makeGameState({ name: 'Other Game' })));
    expect(screen.getByText('Playing Other Game')).toBeInTheDocument();
    jest.mocked(useParams).mockReturnValue({ boardId: 'board-1', mapId: 'map-2' });
    rerender(<Page />);
    expect(screen.getByText('Create game for board-1/map-2')).toBeInTheDocument();
  });

  it('picks up game updates between rendering and subscribing', () => {
    function LoadGame() {
      useLayoutEffect(() => {
        gameStateSyncService.set('board-1', 'map-2', makeGameState());
      }, []);
      return <Page />;
    }
    render(<LoadGame />);
    expect(screen.getByText('Playing Test Game')).toBeInTheDocument();
  });

  it('uses the loading snapshot for server rendering even when client state is cached', () => {
    gameStateSyncService.set('board-1', 'map-2', makeGameState());
    expect(renderToString(<Page />)).toContain('Loading...');
  });
});
