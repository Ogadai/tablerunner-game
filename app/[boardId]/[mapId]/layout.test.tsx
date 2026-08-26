import "@testing-library/jest-dom";
import { act, render, screen } from "@testing-library/react";
import { useParams } from "next/navigation";

import RootLayout from "./layout";
import { bluetoothService } from "../../ble/bluetooth-service";

jest.mock("next/navigation", () => ({
  useParams: jest.fn(),
}));

jest.mock("../../ble/bluetooth-service", () => ({
  bluetoothService: {
    subscribe: jest.fn(),
  },
}));

type GameTopicProps = {
  topicId: string;
  playerId: string;
  onSetBleStatusCallback: (
    callback: (message: { connected: boolean; playerId?: string }) => void,
  ) => void;
  onBleStatusReceived: (
    message: { connected: boolean; playerId?: string } | null,
  ) => void;
};

const mockBluetoothController = jest.fn<null, [
  { bleOtherPlayer: boolean },
]>();
const mockGameTopic = jest.fn<null, [GameTopicProps]>();

jest.mock("../../ble/bluetooth-controller", () => ({
  __esModule: true,
  default: (props: { bleOtherPlayer: boolean }) =>
    mockBluetoothController(props),
}));

jest.mock("../../message-bus/game-topic", () => ({
  __esModule: true,
  default: (props: GameTopicProps) => mockGameTopic(props),
}));

jest.mock("./game/play-header", () => ({
  __esModule: true,
  default: () => <div>Play header</div>,
}));

const getLastGameTopicProps = (): GameTopicProps => {
  const props = mockGameTopic.mock.calls.at(-1)?.[0];
  if (!props) {
    throw new Error("GameTopic was not rendered");
  }
  return props;
};

describe("Route RootLayout", () => {
  const unsubscribe = jest.fn();
  const playerId = "player-123";
  let bluetoothStatusListener:
    | ((connected: string) => void)
    | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    localStorage.clear();

    (useParams as jest.Mock).mockReturnValue({
      boardId: "board-1",
      mapId: "map-2",
    });

    (bluetoothService.subscribe as jest.Mock).mockImplementation(
      (listener: (connected: string) => void) => {
        bluetoothStatusListener = listener;
        return unsubscribe;
      },
    );
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("renders children inside the page content area", () => {
    render(
      <RootLayout>
        <main>Game content</main>
      </RootLayout>,
    );

    expect(screen.getByText("Game content")).toBeInTheDocument();
    expect(screen.getByText("Game content").parentElement).toHaveClass(
      "page-content",
    );
  });

  it("does not render game controls before player initialization", () => {
    render(
      <RootLayout>
        <main>Game content</main>
      </RootLayout>,
    );

    expect(mockBluetoothController).not.toHaveBeenCalled();
    expect(mockGameTopic).not.toHaveBeenCalled();
  });

  it("uses the stored player ID", () => {
    localStorage.setItem("player_guid", playerId);

    render(
      <RootLayout>
        <main>Game content</main>
      </RootLayout>,
    );

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(mockBluetoothController).toHaveBeenCalledWith({
      bleOtherPlayer: false,
    });
    expect(mockGameTopic).toHaveBeenCalledWith(
      expect.objectContaining({
        topicId: "board-1-map-2",
        playerId,
      }),
    );
  });

  it("creates and stores a player ID when none exists", () => {
    const randomUUID = jest
      .spyOn(crypto, "randomUUID")
      .mockReturnValue(playerId);

    render(
      <RootLayout>
        <main>Game content</main>
      </RootLayout>,
    );

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(randomUUID).toHaveBeenCalled();
    expect(localStorage.getItem("player_guid")).toBe(playerId);

    randomUUID.mockRestore();
  });

  it("forwards Bluetooth connection status with the current player ID", () => {
    localStorage.setItem("player_guid", playerId);

    render(
      <RootLayout>
        <main>Game content</main>
      </RootLayout>,
    );

    act(() => {
      jest.runOnlyPendingTimers();
    });

    act(() => {
      bluetoothStatusListener?.("connected");
    });

    expect(getLastGameTopicProps().onSetBleStatusCallback).toBeDefined();

    // The layout's Bluetooth subscription reports the local player's status
    // through the callback registered by GameTopic.
    const gameTopicProps = getLastGameTopicProps();
    const setBleStatusCallback = jest.fn();

    act(() => {
      gameTopicProps.onSetBleStatusCallback(setBleStatusCallback);
    });

    act(() => {
      bluetoothStatusListener?.("connected");
    });

    expect(setBleStatusCallback).toHaveBeenCalledWith({
      connected: true,
      playerId,
    });
  });

  it("marks the Bluetooth controller as connected to another player", () => {
    localStorage.setItem("player_guid", playerId);

    render(
      <RootLayout>
        <main>Game content</main>
      </RootLayout>,
    );

    act(() => {
      jest.runOnlyPendingTimers();
    });

    const gameTopicProps = getLastGameTopicProps();

    act(() => {
      gameTopicProps.onBleStatusReceived({
        connected: true,
        playerId: "other-player",
      });
    });

    expect(mockBluetoothController).toHaveBeenLastCalledWith({
      bleOtherPlayer: true,
    });
  });

  it("does not mark the local player as another Bluetooth player", () => {
    localStorage.setItem("player_guid", playerId);

    render(
      <RootLayout>
        <main>Game content</main>
      </RootLayout>,
    );

    act(() => {
      jest.runOnlyPendingTimers();
    });

    const gameTopicProps = getLastGameTopicProps();

    act(() => {
      gameTopicProps.onBleStatusReceived({
        connected: true,
        playerId,
      });
    });

    expect(mockBluetoothController).toHaveBeenLastCalledWith({
      bleOtherPlayer: false,
    });
  });

  it("unsubscribes from Bluetooth status updates on unmount", () => {
    localStorage.setItem("player_guid", playerId);

    const { unmount } = render(
      <RootLayout>
        <main>Game content</main>
      </RootLayout>,
    );

    act(() => {
      jest.runOnlyPendingTimers();
    });

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
