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


export default function BluetoothController() {
  const params = useParams();
  const [device, setDevice] = useState<any>(null);
  const [bleState, setBleState] = useState<BleState>(BleState.Disconnected);
  const [characteristic, setCharacteristic] = useState<any>(null);
  const [message, setMessage] = useState<string>('');
  const [isSupported, setIsSupported] = useState<boolean>(true);

  const boardId = params.boardId?.toString() || '';
  const BLE_NAME = `${BLE_PREFIX}-${boardId}`;

  const setStatus = (newStatus: string) => {
    console.debug(newStatus);
  }
  // Disconnection handler
  const onDisconnected = useCallback(() => {
    setDevice(null);
    setCharacteristic(null);
    setBleState(BleState.Disconnected);
    setStatus('Disconnected');
  }, []);


  // Connects to a known device object (used for both manual and auto-connect)
  const establishGattConnection = useCallback(async (selectedDevice: any) => {
    try {
      setBleState(BleState.Connecting);
      setStatus(`Connecting to GATT Server on ${selectedDevice.name}...`);
      const server = await selectedDevice.gatt?.connect();

      setStatus('Getting BLE Service...');
      const service = await server?.getPrimaryService(SERVICE_UUID);

      setStatus('Getting BLE Characteristic...');
      const char = await service?.getCharacteristic(CHARACTERISTIC_UUID);

      setDevice(selectedDevice);
      setCharacteristic(char || null);
      setBleState(BleState.Connected);
      setStatus(`Connected to ${selectedDevice.name}`);

      selectedDevice.addEventListener('gattserverdisconnected', onDisconnected);
    } catch (error) {
      console.error(error);
      setBleState(BleState.Error);
      setStatus(`GATT Connection failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }, [onDisconnected]);
  // AUTO-RECONNECT LOGIC (With explicit capability checks)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!navigator.bluetooth) {
      setIsSupported(false);
      setBleState(BleState.NotSupported);
      setStatus('Web Bluetooth is not supported in this browser.');
      return;
    }

    const checkExistingPairs = async () => {
      // 1. DEFENSIVE CHECK: Verify if getDevices exists on the bluetooth object
      if (!('getDevices' in navigator.bluetooth)) {
        console.warn('navigator.bluetooth.getDevices is not supported by this browser.');
        setStatus('Manual pairing required (Auto-reconnect browser API unavailable).');
        return;
      }

      try {
        // 2. Fetch devices this site already has permission to access
        const devices = await (navigator.bluetooth as any).getDevices();

        // Find the first device that fits your ESP32 naming convention
        const rememberedDevice = devices.find((d: any) => d.name?.startsWith(BLE_NAME));

        if (rememberedDevice) {
          setStatus(`Found paired device: ${rememberedDevice.name}. Waiting for signal...`);

          // 3. DEFENSIVE CHECK: Verify if watchAdvertisements exists
          if (!('watchAdvertisements' in rememberedDevice)) {
            console.warn('watchAdvertisements is not supported on this device instance.');
            setStatus('Paired device found, but browser lacks auto-wake capabilities.');
            return;
          }

          // 4. Activate wireless scanning tracking
          await rememberedDevice.watchAdvertisements();

          // 5. Fire connection when the browser catches the ESP32 advertising pulse
          rememberedDevice.addEventListener('advertisementreceived', async (event: any) => {
            setStatus(`Signal spotted from ${event.device.name}! Reconnecting...`);
            await establishGattConnection(event.device);
          });
        } else {
          setStatus('Ready to connect. No previously paired ESP32 found.');
        }
      } catch (err) {
        console.error('Auto-reconnect lookup encountered an error:', err);
        setStatus('Auto-reconnect failed. Please pair manually.');
      }
    };

    checkExistingPairs();
  }, [establishGattConnection]);

  // Manual pair workflow (Used if no cached device exists)
  const connectBluetooth = async () => {
    try {
      setStatus('Requesting Bluetooth device...');
      const selectedDevice = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: BLE_NAME }],
        optionalServices: [SERVICE_UUID],
      });

      await establishGattConnection(selectedDevice);
    } catch (error) {
      console.error(error);
      setStatus(`Connection failed: ${error instanceof Error ? error.message : 'Unknown'}`);
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
      setStatus(`Sent: "${message}"`);
      setMessage('');
    } catch (error) {
      setStatus(`Send error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  };

  const onClick = async () => {
    switch (bleState) {
      case BleState.Disconnected:
      case BleState.Error:
        await connectBluetooth();
        break;
      case BleState.Connected:
        const result = await Swal.fire({
          title: 'Disconnect from board?',
          text: "Are you sure you want to disconnect from the Tablerunner board?",
          showCancelButton: true,
          confirmButtonText: 'Yes, disconnect!'
        })

        if (result.isConfirmed) {
          // Run your delete logic here
          await disconnectBluetooth();
        }
        break;
    }
  }

  return (
    <div>
      <div>
        <button onClick={onClick} className={`${styles.bleButton} ${styles[bleState]}`}>
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
