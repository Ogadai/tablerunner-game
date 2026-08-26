/// <reference types="web-bluetooth" />
'use client';

import { BleState } from './ble-states';

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const BLE_PREFIX = 'TABLERUNNER';

type BleListener = (state: BleState) => void;

export class BluetoothService {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private state = BleState.Disconnected;
  private readonly listeners = new Set<BleListener>();

  getState(): BleState {
    return this.state;
  }

  subscribe(listener: BleListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  initialize(): void {
    if (!this.getBluetooth()) {
      this.setState(BleState.NotSupported);
    }
  }

  async connect(boardId: string): Promise<void> {
    const bluetooth = this.getBluetooth();
    if (!bluetooth) {
      this.setState(BleState.NotSupported);
      return;
    }

    try {
      this.setState(BleState.Connecting);
      const selectedDevice = await bluetooth.requestDevice({
        filters: [{ namePrefix: `${BLE_PREFIX}-${boardId}` }],
        optionalServices: [SERVICE_UUID],
      });
      const server = await selectedDevice.gatt?.connect();
      const service = await server?.getPrimaryService(SERVICE_UUID);
      const characteristic = await service?.getCharacteristic(CHARACTERISTIC_UUID);

      if (!characteristic) {
        throw new Error('Bluetooth characteristic was not found.');
      }

      this.device?.removeEventListener('gattserverdisconnected', this.onDisconnected);
      this.device = selectedDevice;
      this.characteristic = characteristic;
      this.device.addEventListener('gattserverdisconnected', this.onDisconnected);
      localStorage.setItem('ble_connected', 'true');
      this.setState(BleState.Connected);

      // this.runTest();
    } catch (error) {
      this.setState(BleState.Error);
      throw error;
    }
  }
  
  // async runTest () {
  //   await new Promise(r => setTimeout(r, 200));
  //   await this.setAll('ff0000');
  //   await new Promise(r => setTimeout(r, 200));
  //   await this.setAll('00ff00');
  //   await new Promise(r => setTimeout(r, 200));
  //   await this.setAll('0000ff');
  //   await new Promise(r => setTimeout(r, 200));
  //   await this.setAll('ff00ff');
  //   await new Promise(r => setTimeout(r, 200));
  //   await this.setAll('ffff00');

  //   for(let n = 0; n < 298; n++) {
  //     await new Promise(r => setTimeout(r, 10));
  //     await this.sendMessage(`LED|${n}:000000,${n+1}:ff0000,${n+2}:00ff00,${n+3}:0000ff`);
  //   }
  // }

  // async setAll(rgb: string) {
  //   const leds: string[] = [];
  //   for(let n = 0; n < 300; n++) {
  //     leds.push(`${n}:${rgb}`);
  //   }

  //   const chunkSize = 40;
  //   for (let i = 0; i < leds.length; i += chunkSize) {
  //     const chunk = leds.slice(i, i + chunkSize);
  //     await this.sendMessage(`LED|${chunk.join(',')}`);
  //   }
  // }

  disconnect(): void {
    this.device?.gatt?.disconnect();
    this.onDisconnected();
  }

  async sendMessage(message: string): Promise<boolean> {
    if (!this.characteristic || !this.device?.gatt?.connected) {
      return false;
    }

    await this.characteristic.writeValue(new TextEncoder().encode(message));
    return true;
  }

  private readonly onDisconnected = (): void => {
    this.device?.removeEventListener('gattserverdisconnected', this.onDisconnected);
    this.device = null;
    this.characteristic = null;
    localStorage.setItem('ble_connected', 'false');
    this.setState(BleState.Disconnected);
  };

  private getBluetooth(): Bluetooth {
    return navigator.bluetooth;
  }

  private setState(state: BleState): void {
    this.state = state;
    this.listeners.forEach(listener => listener(state));
  }
}

export const bluetoothService = new BluetoothService();
