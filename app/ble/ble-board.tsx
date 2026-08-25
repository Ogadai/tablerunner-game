'use client';

import { useParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react';
import "material-symbols/outlined.css"; // Options: outlined, rounded, or sharp
import Swal from 'sweetalert2'

import { BleState } from './ble-states';
import { bluetoothService } from './bluetooth-service';
import styles from "./ble-board.module.css";

export default function BluetoothController({
  bleOtherPlayer,
}: {
  bleOtherPlayer: boolean;
}) {
  const params = useParams();
  const [bleState, setBleState] = useState<BleState>(bluetoothService.getState());
  const [message, setMessage] = useState<string>('');

  const boardId = params.boardId?.toString() || '';
  // Manual pair workflow (Used if no cached device exists)
  const connectBluetooth = useCallback(async () => {
    try {
      await bluetoothService.connect(boardId);
    } catch (error) {
      console.error(error);
    }
  }, [boardId]);

  const disconnectBluetooth = () => {
    bluetoothService.disconnect();
  };

  const sendMessage = async () => {
    try {
      if (await bluetoothService.sendMessage(message)) {
        setMessage('');
      }
    } catch (error) {
      console.error(`Send error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  };

  const askReconnect = useCallback(async () => {
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
  }, [connectBluetooth]);

  useEffect(() => {
    bluetoothService.initialize();
    const unsubscribe = bluetoothService.subscribe(setBleState);

    if (localStorage.getItem('ble_connected') === 'true') {
      askReconnect();
    }
    return unsubscribe;
  }, [askReconnect]);

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
    <button onClick={onClick} className={`${styles.bleButton} ${styles[showBleState]}`}>
      <span className="material-symbols-outlined">bluetooth</span>
    </button>
  );
}
