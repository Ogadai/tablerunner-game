'use client';

import { useParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react';
import "material-symbols/outlined.css"; // Options: outlined, rounded, or sharp
import Swal from 'sweetalert2'

import { BleState } from './ble-states';
import styles from "./ble-board.module.css";

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const BLE_PREFIX = 'TABLERUNNER';


export default function BluetoothController({
  bleOtherPlayer,
  onBleStatus = () => {}
}: {
  bleOtherPlayer: boolean,
  onBleStatus?: (connected: boolean) => void;
}) {
  const params = useParams();
  const [device, setDevice] = useState<any>(null);
  const [bleState, setBleState] = useState<BleState>(BleState.Disconnected);
  const [characteristic, setCharacteristic] = useState<any>(null);
  const [message, setMessage] = useState<string>('');
  const [isSupported, setIsSupported] = useState<boolean>(true);

  const boardId = params.boardId?.toString() || '';
  const BLE_NAME = `${BLE_PREFIX}-${boardId}`;

  // Disconnection handler
  const onDisconnected = useCallback(() => {
    setDevice(null);
    setCharacteristic(null);
    setBleState(BleState.Disconnected);
    onBleStatus(false);
  }, []);


  // Connects to a known device object (used for both manual and auto-connect)
  const establishGattConnection = useCallback(async (selectedDevice: any) => {
    try {
      setBleState(BleState.Connecting);
      const server = await selectedDevice.gatt?.connect();

      const service = await server?.getPrimaryService(SERVICE_UUID);

      const char = await service?.getCharacteristic(CHARACTERISTIC_UUID);

      setDevice(selectedDevice);
      setCharacteristic(char || null);
      setBleState(BleState.Connected);
      localStorage.setItem('ble_connected', 'true');
      onBleStatus(true);

      selectedDevice.addEventListener('gattserverdisconnected', onDisconnected);
    } catch (error) {
      console.error(error);
      setBleState(BleState.Error);

      errorRetryConnect();
    }
  }, [onDisconnected]);
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!navigator.bluetooth) {
      setIsSupported(false);
      setBleState(BleState.NotSupported);
      return;
    }

    let bleConnected: boolean = localStorage.getItem('ble_connected') === 'true';
    if (bleConnected) {
      askReconnect();
    }
  }, [establishGattConnection]);

  // Manual pair workflow (Used if no cached device exists)
  const connectBluetooth = async () => {
    try {
      const selectedDevice = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: BLE_NAME }],
        optionalServices: [SERVICE_UUID],
      });

      await establishGattConnection(selectedDevice);
    } catch (error) {
      console.error(error);
    }
  };

  const disconnectBluetooth = () => {
    if (device?.gatt?.connected) {
      device.gatt.disconnect();
    }
    onDisconnected();
  };

  const sendMessage = async () => {
    if (!characteristic) return;
    try {
      const encoder = new TextEncoder();
      await characteristic.writeValue(encoder.encode(message));
     setMessage('');
    } catch (error) {
      console.error(`Send error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  };

  const askReconnect = async () => {
    const result = await Swal.fire({
      title: 'Reconnect to board?',
      text: "Would you like to reconnect to the Tablerunner board?",
      showCancelButton: true,
      confirmButtonText: 'Connect'
    })

    if (result.isConfirmed) {
      await connectBluetooth();
    } else {
      localStorage.setItem('ble_connected', 'false');
    }
  }

  const errorRetryConnect = async () => {
    const result = await Swal.fire({
      title: 'Error connecting?',
      text: "Would you like to re-try connecting to the Tablerunner board?",
      showCancelButton: true,
      confirmButtonText: 'Connect'
    })

    if (result.isConfirmed) {
      await connectBluetooth();
    } else {
      localStorage.setItem('ble_connected', 'false');
    }
  }

  const showBleState = bleOtherPlayer ? BleState.OtherConnected : bleState;
  const onClick = async () => {
    switch (showBleState) {
      case BleState.Disconnected:
      case BleState.Error:
        if (!bleOtherPlayer) {
          await connectBluetooth();
        }
        break;
      case BleState.Connected:
        const result = await Swal.fire({
          title: 'Disconnect from board?',
          text: "Are you sure you want to disconnect from the Tablerunner board?",
          showCancelButton: true,
          confirmButtonText: 'Yes, disconnect!'
        })

        if (result.isConfirmed) {
          localStorage.setItem('ble_connected', 'false');

          // Run your delete logic here
          await disconnectBluetooth();
        }
        break;
      case BleState.NotSupported:
        await Swal.fire({
          title: 'Not supported',
          text: "Unfortunately, your browser doesn't support Bluetooth devices.",
          confirmButtonText: 'Ok'
        });
        break;
      case BleState.OtherConnected:
        await Swal.fire({
          title: 'Already connected',
          text: "Another device is already connected to this Tablerunner board. You only need to connect one device.",
          confirmButtonText: 'Ok'
        });
        break;
    }
  }

  return (
    <div>
      <div>
        <button onClick={onClick} className={`${styles.bleButton} ${styles[showBleState]}`}>
          <span className="material-symbols-outlined">bluetooth</span>
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
        <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type message..." disabled={!characteristic} style={{ padding: '8px' }} />
        <button onClick={sendMessage} disabled={!characteristic || !message} style={{ padding: '8px 16px', backgroundColor: '#10b981', color: '#fff', border: 'none' }}>
          Send Message
        </button>
      </div>
    </div>
  );
}
