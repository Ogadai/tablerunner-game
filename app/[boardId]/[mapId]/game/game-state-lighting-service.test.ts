import { BleState } from '@/app/ble/ble-states';
import type service from './game-state-lighting-service';
import { makeGameState, makePlayer } from './test-fixtures';

jest.mock('@/app/ble/bluetooth-service', () => ({
  bluetoothService: {
    getState: jest.fn(), subscribe: jest.fn(), setBrightness: jest.fn(),
    setColourForLeds: jest.fn(), setColourPerLed: jest.fn(), setAnimationForLeds: jest.fn(),
  },
}));
jest.mock('@/lib/store/gameState', () => ({ getBoardSettings: jest.fn() }));

describe('gameStateLightingService', () => {
  let lighting: typeof service;
  let bluetooth: jest.Mocked<typeof import('@/app/ble/bluetooth-service').bluetoothService>;
  let getSettings: jest.MockedFunction<typeof import('@/lib/store/gameState').getBoardSettings>;
  let connectionChanged: (state: BleState) => Promise<void>;

  beforeEach(async () => {
    jest.resetModules();
    bluetooth = jest.mocked((await import('@/app/ble/bluetooth-service')).bluetoothService);
    bluetooth.getState.mockReturnValue(BleState.Connected);
    bluetooth.subscribe.mockImplementation(listener => {
      connectionChanged = listener as typeof connectionChanged;
      return jest.fn();
    });
    getSettings = jest.mocked((await import('@/lib/store/gameState')).getBoardSettings);
    getSettings.mockResolvedValue({ success: true, data: { brightness: 80 } });
    lighting = (await import('./game-state-lighting-service')).default;
  });

  it('subscribes once and waits for a connection before applying the latest state', async () => {
    bluetooth.getState.mockReturnValue(BleState.Disconnected);
    await lighting.initialiseSubscription();
    await lighting.update('board', 'map', makeGameState({ visited: [1] }));
    await lighting.update('board', 'map', makeGameState({ visited: [2] }));
    await connectionChanged(BleState.Connecting);
    expect(bluetooth.subscribe).toHaveBeenCalledTimes(1);
    expect(getSettings).not.toHaveBeenCalled();
    expect(bluetooth.setColourForLeds).not.toHaveBeenCalled();
    bluetooth.getState.mockReturnValue(BleState.Connected);
    await connectionChanged(BleState.Connected);
    expect(getSettings).toHaveBeenCalledWith('board', 'map');
    expect(bluetooth.setBrightness).toHaveBeenCalledWith(80);
    expect(bluetooth.setColourForLeds).toHaveBeenNthCalledWith(1, [2], '707070');
  });

  it('applies visited colours, explicit zero-based LED overrides, and clears every other location', async () => {
    await lighting.update('board', 'map', makeGameState({
      visited: [1, 2],
      leds: [{ location: 2, rgb: 'ff0000', owner: 'test' }, { location: 240, rgb: '00ff00', owner: 'test' }],
    }));
    expect(bluetooth.setColourForLeds).toHaveBeenNthCalledWith(1, [1, 2], '707070');
    expect(bluetooth.setColourPerLed).toHaveBeenCalledWith([{ led: 1, rgb: 'ff0000' }, { led: 239, rgb: '00ff00' }]);
    expect(bluetooth.setColourForLeds).toHaveBeenNthCalledWith(2, Array.from({ length: 237 }, (_, i) => i + 3), '000000');
    expect(bluetooth.setColourForLeds.mock.invocationCallOrder[0]).toBeLessThan(bluetooth.setColourPerLed.mock.invocationCallOrder[0]);
  });

  it('groups players sharing a location and adds an off frame only to solo players', async () => {
    await lighting.update('board', 'map', makeGameState({ players: [
      makePlayer(), makePlayer({ id: 'mage', rgbColour: '0000ff' }),
      makePlayer({ id: 'rogue', rgbColour: '00ff00', location: { id: 240, description: 'End', move: [] } }),
    ] }));
    expect(bluetooth.setAnimationForLeds).toHaveBeenCalledWith([
      { leds: [1], rgbColours: ['ff0000', '0000ff'] },
      { leds: [240], rgbColours: ['00ff00', '000000'] },
    ]);
  });

  it('clears all 240 lights when no game exists', async () => {
    await lighting.update('board', 'map', undefined);
    expect(bluetooth.setColourForLeds).toHaveBeenCalledTimes(1);
    expect(bluetooth.setColourForLeds).toHaveBeenCalledWith(Array.from({ length: 240 }, (_, i) => i + 1), '000000');
    expect(bluetooth.setColourPerLed).not.toHaveBeenCalled();
    expect(bluetooth.setAnimationForLeds).not.toHaveBeenCalled();
  });

  it('sends an empty animation list when a game has no players', async () => {
    await lighting.update('board', 'map', makeGameState());
    expect(bluetooth.setAnimationForLeds).toHaveBeenCalledWith([]);
    expect(bluetooth.setColourPerLed).not.toHaveBeenCalled();
  });

  it('reloads settings only on board or map changes and reconnects', async () => {
    await lighting.update('board', 'map', undefined);
    await lighting.update('board', 'map', undefined);
    expect(getSettings).toHaveBeenCalledTimes(1);
    await lighting.update('other', 'map', undefined);
    await lighting.update('other', 'other-map', undefined);
    await connectionChanged(BleState.Connected);
    expect(getSettings.mock.calls).toEqual([['board', 'map'], ['other', 'map'], ['other', 'other-map'], ['other', 'other-map']]);
  });

  it('does not retrieve or apply settings before a board is selected', async () => {
    expect(await lighting.getSettings()).toBeUndefined();
    await lighting.applySettings({ brightness: 100 });
    expect(getSettings).not.toHaveBeenCalled();
    expect(bluetooth.setBrightness).not.toHaveBeenCalled();
  });

  it('applies explicit settings without fetching and skips disconnected or nonpositive brightness', async () => {
    await lighting.update('board', 'map', undefined);
    jest.clearAllMocks();
    await lighting.applySettings({ brightness: 100 });
    await lighting.applySettings({ brightness: 0 });
    await lighting.applySettings({ brightness: -1 });
    bluetooth.getState.mockReturnValue(BleState.Disconnected);
    await lighting.applySettings({ brightness: 150 });
    expect(getSettings).not.toHaveBeenCalled();
    expect(bluetooth.setBrightness).toHaveBeenCalledTimes(1);
    expect(bluetooth.setBrightness).toHaveBeenCalledWith(100);
  });

  it.each([{ success: false }, { success: true }])('ignores unavailable settings: %j', async result => {
    getSettings.mockResolvedValue(result);
    await lighting.update('board', 'map', undefined);
    expect(await lighting.getSettings()).toBeUndefined();
    expect(bluetooth.setBrightness).not.toHaveBeenCalled();
    expect(bluetooth.setColourForLeds).toHaveBeenCalled();
  });
});
