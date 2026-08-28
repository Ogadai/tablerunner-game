/// <reference types="web-bluetooth" />
'use client';

import { BleState } from './ble-states';

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const BLE_PREFIX = 'TABLERUNNER';

type BleListener = (state: BleState) => void;

const maxCommandLength = 256;

export class BluetoothService {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private state = BleState.Disconnected;
  private readonly listeners = new Set<BleListener>();
  private messageQueue: Promise<void> = Promise.resolve();

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

      await this.runWelcome();
      this.setState(BleState.Connected);
    } catch (error) {
      this.setState(BleState.Error);
      throw error;
    }
  }
  
  private async runWelcome () {
    await this.setAll('ff0000');

    this.messageQueue = this.messageQueue.then(
      () => new Promise(r => setTimeout(r, 1000))
    )
    
    await this.setAll('000000');

    // await new Promise(r => setTimeout(r, 1000));
    // await this.setAll('000000');
    // await new Promise(r => setTimeout(r, 200));
    // await this.setAll('00ff00');
    // await new Promise(r => setTimeout(r, 200));
    // await this.setAll('0000ff');
    // await new Promise(r => setTimeout(r, 200));
    // await this.setAll('ff00ff');
    // await new Promise(r => setTimeout(r, 200));
    // await this.setAll('ffff00');

    // for(let n = 0; n < 3; n++) {
    //   await new Promise(r => setTimeout(r, 10));
    //   await this.sendMessage(`LED|${n}/${n+4}/${n+5}:000000,${n+1}:ff0000,${n+2}:00ff00,${n+3}:0000ff`);
    // }
  }

  async setColourForLeds(leds: number[], rgb: string) {
    const ledIDs: string[] = leds.map(l => `${l-1}`);
    const maxLength = maxCommandLength - rgb.length - 10;

    let startIndex = 0;
    let chunkLength = 0;
    for (let i = 0; i < leds.length; i++) {
      const nextLen = ledIDs[i].length + 1;
      if (chunkLength + nextLen > maxLength) {
        const chunk = ledIDs.slice(startIndex, i);
        await this.sendMessage(`LED|${chunk.join('/')}:${rgb}`);

        chunkLength = 0;
        startIndex = i;
      } else {
        chunkLength += nextLen;
      }
    }

    if (startIndex < leds.length) {
      const chunk = ledIDs.slice(startIndex);
      await this.sendMessage(`LED|${chunk.join('/')}:${rgb}`);
    }
  }

  disconnect(): void {
    this.device?.gatt?.disconnect();
    this.onDisconnected();
  }

  async sendMessage(message: string): Promise<void> {
    this.messageQueue = this.messageQueue.then(
      async() => await this.sendMessageInternal(message)
    );
  }

  private async sendMessageInternal(message: string): Promise<void> {
    if (!this.characteristic || !this.device?.gatt?.connected) {
      return;
    }
    await this.characteristic.writeValue(new TextEncoder().encode(message));
  }

  private async setAll(rgb: string) {
    const leds: number[] = [];
    for(let n = 0; n < 240; n++) {
      leds.push(n + 1);
    }

    await this.setColourForLeds(leds, rgb);
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
