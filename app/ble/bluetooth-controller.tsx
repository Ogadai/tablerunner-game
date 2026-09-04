'use client';

import { useParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react';
import "material-symbols/outlined.css"; // Options: outlined, rounded, or sharp
import Swal from 'sweetalert2'
import { getSwalDefaultOptions } from '@/app/swal';

import { BleState } from './ble-states';
import { bluetoothService } from './bluetooth-service';
import styles from "./bluetooth-controller.module.css";

const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
};

const GLOBAL_STATE: { connectTimeout: any, isPrompting: boolean } = {
  connectTimeout: null,
  isPrompting: false
}

export default function BluetoothController({
  bleOtherPlayer,
}: {
  bleOtherPlayer: boolean;
}) {
  const params = useParams();
  const [bleState, setBleState] = useState<BleState>(bluetoothService.getState());

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

  const askReconnect = async () => {
    const result = await Swal.fire({
      ...getSwalDefaultOptions(),
      title: 'Reconnect to board?',
      text: "Would you like to reconnect to the Tablerunner board?",
      showCancelButton: true,
      confirmButtonColor: 'var(--gold-antique)',
      confirmButtonText: 'Connect'
    })

    if (result.isConfirmed) {
      await connectBluetooth();
    } else {
      localStorage.setItem('ble_connected', 'false');
    }
  };

  const checkAskConnect = () => {
    if (!GLOBAL_STATE.connectTimeout) {
      const timeout = setTimeout(async () => {
        GLOBAL_STATE.connectTimeout = null;
        GLOBAL_STATE.isPrompting = true;
        await askConnect();
        GLOBAL_STATE.isPrompting = false;
      }, 2000);

      GLOBAL_STATE.connectTimeout = timeout;
    }
  }

  const askConnect = async () => {
    const result = await Swal.fire({
      ...getSwalDefaultOptions(),
      title: 'Connect to board?',
      text: "One device should be connected to the Tablerunner board. Connect this device?",
      showCancelButton: true,
      confirmButtonColor: 'var(--gold-antique)',
      confirmButtonText: 'Connect'
    });

    if (result.isConfirmed) {
      await connectBluetooth();
    }
  };

  useEffect(() => {
    if (GLOBAL_STATE.connectTimeout) {
      clearTimeout(GLOBAL_STATE.connectTimeout);
      GLOBAL_STATE.connectTimeout = null;
    }
    if (bleOtherPlayer && GLOBAL_STATE.isPrompting) {
      Swal.close({ isConfirmed: false });
    }

    bluetoothService.initialize();
    const unsubscribe = bluetoothService.subscribe(setBleState);

    // if (localStorage.getItem('ble_connected') === 'true') {
    //   askReconnect();
    // } else
    if (!bleOtherPlayer &&
      bluetoothService.getState() !== BleState.Connected &&
      bluetoothService.getState() !== BleState.OtherConnected) {
      checkAskConnect();
    }
    return unsubscribe;
  }, [bleOtherPlayer]);

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
          ...getSwalDefaultOptions(),
          title: 'Disconnect from board?',
          text: "Are you sure you want to disconnect from the Tablerunner board?",
          showCancelButton: true,
          confirmButtonColor: 'var(--color-error)',
          confirmButtonText: 'Disconnect!'
        })

        if (result.isConfirmed) {
          await disconnectBluetooth();
        }
        break;
      case BleState.NotSupported:
        const iosMessage = isIOS()
          ? "Apple prevents iOS web engines from using Web Bluetooth standards. Only one device in the game needs to connect to the board, and an Android device is ideal. If using iOS, the browser \"Bluefy\" in the App Store supports Bluetooth."
          : "Unfortunately, your browser doesn't support Bluetooth devices.";
        
        await Swal.fire({
          ...getSwalDefaultOptions(),
          title: 'Not supported',
          text: iosMessage,
          confirmButtonColor: 'var(--gold-antique)',
          confirmButtonText: 'Ok'
        });
        break;
      case BleState.OtherConnected:
        await Swal.fire({
          ...getSwalDefaultOptions(),
          title: 'Already connected',
          text: "Another device is already connected to this Tablerunner board. You only need to connect one device.",
          confirmButtonColor: 'var(--gold-antique)',
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
