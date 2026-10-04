import { BluetoothService } from './bluetooth-service';
import { BleState } from './ble-states';

describe('BluetoothService', () => {
  let service: BluetoothService;
  let mockCharacteristic: { writeValue: jest.Mock<Promise<void>, [Uint8Array]> };
  let mockDevice: {
    gatt: { connected: boolean; connect: jest.Mock; disconnect: jest.Mock };
    addEventListener: jest.Mock;
    removeEventListener: jest.Mock;
  };
  let mockServer: { getPrimaryService: jest.Mock };
  let mockBluetooth: { requestDevice: jest.Mock };

  async function connect() {
    const connecting = service.connect('board-42');
    await jest.runAllTimersAsync();
    await connecting;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    service = new BluetoothService();

    mockCharacteristic = {
      writeValue: jest.fn().mockResolvedValue(undefined),
    };

    mockServer = {
      getPrimaryService: jest.fn().mockResolvedValue({
        getCharacteristic: jest.fn().mockResolvedValue(mockCharacteristic),
      }),
    };

    mockDevice = {
      gatt: {
        connected: true,
        connect: jest.fn().mockResolvedValue(mockServer),
        disconnect: jest.fn(),
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    mockBluetooth = {
      requestDevice: jest.fn().mockResolvedValue(mockDevice),
    };

    Object.defineProperty(navigator, 'bluetooth', {
      value: mockBluetooth,
      configurable: true,
      writable: true,
    });

    localStorage.clear();
  });

  afterEach(async () => {
    // Drain any pending welcome animation before replacing this test's BLE mocks.
    await jest.runAllTimersAsync();
    jest.useRealTimers();
    jest.restoreAllMocks();
    Reflect.deleteProperty(navigator, 'bluetooth');
    localStorage.clear();
  });

  it('should start disconnected and notify new subscribers immediately', () => {
    const listener = jest.fn();

    const unsubscribe = service.subscribe(listener);

    expect(service.getState()).toBe(BleState.Disconnected);
    expect(listener).toHaveBeenCalledWith(BleState.Disconnected);

    unsubscribe();
  });

  it('should set NotSupported when initialize runs without Bluetooth support', () => {
    Reflect.deleteProperty(navigator, 'bluetooth');

    service.initialize();

    expect(service.getState()).toBe(BleState.NotSupported);
  });

  it('should request a device, connect, and move to Connected state', async () => {
    await connect();

    expect(mockBluetooth.requestDevice).toHaveBeenCalledWith({
      filters: [{ namePrefix: 'TABLERUNNER-board-42' }],
      optionalServices: ['4fafc201-1fb5-459e-8fcc-c5c9c331914b'],
    });

    expect(mockDevice.gatt.connect).toHaveBeenCalledTimes(1);
    expect(mockDevice.addEventListener).toHaveBeenCalledWith(
      'gattserverdisconnected',
      expect.any(Function)
    );
    expect(localStorage.getItem('ble_connected')).toBe('true');
    expect(service.getState()).toBe(BleState.Connected);
  });

  it('should set state to Error and rethrow when the connection fails', async () => {
    const error = new Error('device rejected');

    mockBluetooth.requestDevice.mockRejectedValue(error);

    await expect(service.connect('board-42')).rejects.toThrow('device rejected');
    expect(service.getState()).toBe(BleState.Error);
  });

  it('should retry a failed connection and connect on a later attempt', async () => {
    const error = new Error('temporary failure');
    mockBluetooth.requestDevice
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(mockDevice);

    await connect();

    expect(mockBluetooth.requestDevice).toHaveBeenCalledTimes(2);
    expect(service.getState()).toBe(BleState.Connected);
  });

  it('should stop after three failed connection attempts', async () => {
    const error = new Error('persistent failure');
    mockBluetooth.requestDevice.mockRejectedValue(error);

    await expect(service.connect('board-42')).rejects.toThrow('persistent failure');

    expect(mockBluetooth.requestDevice).toHaveBeenCalledTimes(3);
    expect(service.getState()).toBe(BleState.Error);
  });

  it('should set state to NotSupported and return early when no Bluetooth is available', async () => {
    Reflect.deleteProperty(navigator, 'bluetooth');

    await service.connect('board-42');

    expect(service.getState()).toBe(BleState.NotSupported);
    expect(mockBluetooth.requestDevice).not.toHaveBeenCalled();
  });

  it('should disconnect and clear the device state', () => {
    service['device'] = mockDevice as unknown as BluetoothDevice;
    service['characteristic'] = mockCharacteristic as unknown as BluetoothRemoteGATTCharacteristic;

    service.disconnect();

    expect(mockDevice.gatt.disconnect).toHaveBeenCalledTimes(1);
    expect(mockDevice.removeEventListener).toHaveBeenCalledWith(
      'gattserverdisconnected',
      expect.any(Function)
    );
    expect(localStorage.getItem('ble_connected')).toBe('false');
    expect(service.getState()).toBe(BleState.Disconnected);
  });

  it('should skip sending when no characteristic is available', async () => {
    await service.sendMessage('PING');
    await jest.runAllTimersAsync();

    expect(mockCharacteristic.writeValue).not.toHaveBeenCalled();
  });

  it('should send a message using the BLE characteristic when connected', async () => {
    service['device'] = mockDevice as unknown as BluetoothDevice;
    service['characteristic'] = mockCharacteristic as unknown as BluetoothRemoteGATTCharacteristic;

    await service.sendMessage('PING');
    await jest.runAllTimersAsync();

    expect(mockCharacteristic.writeValue).toHaveBeenCalledTimes(1);

    const payload = mockCharacteristic.writeValue.mock.calls[0][0];
    expect(Array.from(payload)).toEqual(Array.from(new TextEncoder().encode('PING')));
  });

  it('should update listeners when the service disconnects unexpectedly', () => {
    const listener = jest.fn();
    service.subscribe(listener);

    service['device'] = mockDevice as unknown as BluetoothDevice;
    service['characteristic'] = mockCharacteristic as unknown as BluetoothRemoteGATTCharacteristic;

    service['onDisconnected']();

    expect(listener).toHaveBeenLastCalledWith(BleState.Disconnected);
    expect(service['device']).toBeNull();
    expect(service['characteristic']).toBeNull();
  });

  it('should wait for the welcome sequence before reporting Connected', async () => {
    const connecting = service.connect('board-42');
    await jest.advanceTimersByTimeAsync(0);

    expect(service.getState()).toBe(BleState.Connecting);

    await jest.runAllTimersAsync();
    await connecting;

    expect(service.getState()).toBe(BleState.Connected);
  });

  it('should reconnect and send commands after a failed write', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await connect();
    mockCharacteristic.writeValue.mockRejectedValueOnce(new Error('Connection lost'));

    await service.sendMessage('FAILED');

    expect(service.getState()).toBe(BleState.Disconnected);
    expect(mockDevice.gatt.disconnect).toHaveBeenCalledTimes(1);

    await connect();
    mockCharacteristic.writeValue.mockClear();
    await service.setColourForLeds([42], 'ff0000');

    expect(service.getState()).toBe(BleState.Connected);
    expect(mockCharacteristic.writeValue).toHaveBeenCalledTimes(1);
    expect(Array.from(mockCharacteristic.writeValue.mock.calls[0][0])).toEqual(
      Array.from(new TextEncoder().encode('LED|41:ff0000'))
    );
  });

  it('should discard old queued commands and ignore late failures after reconnecting', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await connect();
    let rejectWrite!: (error: Error) => void;
    mockCharacteristic.writeValue.mockImplementationOnce(() => new Promise<void>((resolve, reject) => {
      rejectWrite = reject;
    }));

    const pending = service.sendMessage('PENDING');
    await Promise.resolve();
    const queued = service.sendMessage('STALE');
    service.disconnect();

    const newCharacteristic = { writeValue: jest.fn().mockResolvedValue(undefined) };
    mockServer.getPrimaryService.mockResolvedValue({
      getCharacteristic: jest.fn().mockResolvedValue(newCharacteristic),
    });
    await connect();
    newCharacteristic.writeValue.mockClear();

    rejectWrite(new Error('Old connection lost'));
    await Promise.all([pending, queued]);
    await service.sendMessage('CURRENT');

    expect(service.getState()).toBe(BleState.Connected);
    expect(newCharacteristic.writeValue).toHaveBeenCalledTimes(1);
    expect(Array.from(newCharacteristic.writeValue.mock.calls[0][0])).toEqual(
      Array.from(new TextEncoder().encode('CURRENT'))
    );
  });
});
