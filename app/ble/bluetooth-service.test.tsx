import { BluetoothService } from './bluetooth-service';
import { BleState } from './ble-states';

describe('BluetoothService', () => {
  let service: BluetoothService;
  let mockCharacteristic: any;
  let mockDevice: any;
  let mockServer: any;
  let mockBluetooth: any;

  beforeEach(() => {
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

  afterEach(() => {
    delete (navigator as any).bluetooth;
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
    delete (navigator as any).bluetooth;

    service.initialize();

    expect(service.getState()).toBe(BleState.NotSupported);
  });

  it('should request a device, connect, and move to Connected state', async () => {
    await service.connect('board-42');

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

  it('should set state to NotSupported and return early when no Bluetooth is available', async () => {
    delete (navigator as any).bluetooth;

    await service.connect('board-42');

    expect(service.getState()).toBe(BleState.NotSupported);
    expect(mockBluetooth.requestDevice).not.toHaveBeenCalled();
  });

  it('should disconnect and clear the device state', () => {
    (service as any).device = mockDevice;
    (service as any).characteristic = mockCharacteristic;

    service.disconnect();

    expect(mockDevice.gatt.disconnect).toHaveBeenCalledTimes(1);
    expect(mockDevice.removeEventListener).toHaveBeenCalledWith(
      'gattserverdisconnected',
      expect.any(Function)
    );
    expect(localStorage.getItem('ble_connected')).toBe('false');
    expect(service.getState()).toBe(BleState.Disconnected);
  });

  it('should return false when no characteristic is available for sending', async () => {
    const result = await service.sendMessage('PING');

    expect(result).toBe(false);
  });

  it('should send a message using the BLE characteristic when connected', async () => {
    (service as any).device = mockDevice;
    (service as any).characteristic = mockCharacteristic;

    const result = await service.sendMessage('PING');

    expect(result).toBe(true);
    expect(mockCharacteristic.writeValue).toHaveBeenCalledTimes(1);

    const payload = mockCharacteristic.writeValue.mock.calls[0][0];
    expect(Array.from(payload)).toEqual(Array.from(new TextEncoder().encode('PING')));
  });

  it('should update listeners when the service disconnects unexpectedly', () => {
    const listener = jest.fn();
    service.subscribe(listener);

    (service as any).device = mockDevice;
    (service as any).characteristic = mockCharacteristic;

    (service as any).onDisconnected();

    expect(listener).toHaveBeenLastCalledWith(BleState.Disconnected);
    expect((service as any).device).toBeNull();
    expect((service as any).characteristic).toBeNull();
  });
});
