import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BluetoothController from './bluetooth-controller';
import { BleState } from './ble-states';
import Swal from 'sweetalert2';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
}));

// Mock the bluetooth service
jest.mock('./bluetooth-service', () => ({
  bluetoothService: {
    getState: jest.fn(),
    initialize: jest.fn(),
    subscribe: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    sendMessage: jest.fn(),
  },
}));

// Mock sweetalert2
jest.mock('sweetalert2', () => ({
  __esModule: true,
  default: {
    fire: jest.fn(),
  },
}));

// Mock the material symbols CSS
jest.mock('material-symbols/outlined.css', () => ({}));

import { useParams } from 'next/navigation';
import { bluetoothService } from './bluetooth-service';

describe('BluetoothController', () => {
  const mockBoardId = 'test-board-123';

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (useParams as jest.Mock).mockReturnValue({ boardId: mockBoardId });
    (bluetoothService.getState as jest.Mock).mockReturnValue(BleState.Disconnected);
    (bluetoothService.subscribe as jest.Mock).mockReturnValue(jest.fn());
  });

  describe('Rendering', () => {
    it('should render the bluetooth button', () => {
      render(<BluetoothController bleOtherPlayer={false} />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should render with disconnected state class', () => {
      render(<BluetoothController bleOtherPlayer={false} />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass(BleState.Disconnected);
    });

    it('should render with correct state class when connected', () => {
      (bluetoothService.getState as jest.Mock).mockReturnValue(BleState.Connected);
      render(<BluetoothController bleOtherPlayer={false} />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass(BleState.Connected);
    });

    it('should display OtherConnected state when bleOtherPlayer is true', () => {
      (bluetoothService.getState as jest.Mock).mockReturnValue(BleState.Disconnected);
      render(<BluetoothController bleOtherPlayer={true} />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass(BleState.OtherConnected);
    });
  });

  describe('Initialization', () => {
    it('should initialize bluetooth service on mount', () => {
      render(<BluetoothController bleOtherPlayer={false} />);
      expect(bluetoothService.initialize).toHaveBeenCalled();
    });

    it('should subscribe to bluetooth service on mount', () => {
      render(<BluetoothController bleOtherPlayer={false} />);
      expect(bluetoothService.subscribe).toHaveBeenCalled();
    });

    it('should unsubscribe from bluetooth service on unmount', () => {
      const mockUnsubscribe = jest.fn();
      (bluetoothService.subscribe as jest.Mock).mockReturnValue(mockUnsubscribe);
      const { unmount } = render(<BluetoothController bleOtherPlayer={false} />);
      unmount();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Connection workflow', () => {
    it('should call connect when button clicked in disconnected state', async () => {
      render(<BluetoothController bleOtherPlayer={false} />);
      const button = screen.getByRole('button');

      fireEvent.click(button);

      expect(bluetoothService.connect).toHaveBeenCalledWith(mockBoardId);
    });

    it('should not attempt to connect when bleOtherPlayer is true', async () => {
      render(<BluetoothController bleOtherPlayer={true} />);
      const button = screen.getByRole('button');

      fireEvent.click(button);

      expect(bluetoothService.connect).not.toHaveBeenCalled();
    });

    it('should show alert when trying to connect with bleOtherPlayer true', async () => {
      (Swal.fire as jest.Mock).mockResolvedValue({ isConfirmed: false });
      render(<BluetoothController bleOtherPlayer={true} />);
      const button = screen.getByRole('button');

      fireEvent.click(button);

      await waitFor(() => {
        expect(Swal.fire).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Already connected',
            text: expect.stringContaining('Another device is already connected'),
          })
        );
      });
    });

    it('should handle connection errors gracefully', async () => {
      const error = new Error('Connection failed');
      (bluetoothService.connect as jest.Mock).mockRejectedValue(error);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<BluetoothController bleOtherPlayer={false} />);
      const button = screen.getByRole('button');

      fireEvent.click(button);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(error);
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Disconnection workflow', () => {
    it('should show disconnect confirmation dialog when connected', async () => {
      (bluetoothService.getState as jest.Mock).mockReturnValue(BleState.Connected);
      (Swal.fire as jest.Mock).mockResolvedValue({ isConfirmed: false });

      render(<BluetoothController bleOtherPlayer={false} />);
      const button = screen.getByRole('button');

      fireEvent.click(button);

      await waitFor(() => {
        expect(Swal.fire).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Disconnect from board?',
          })
        );
      });
    });

    it('should call disconnect when user confirms disconnection', async () => {
      (bluetoothService.getState as jest.Mock).mockReturnValue(BleState.Connected);
      (Swal.fire as jest.Mock).mockResolvedValue({ isConfirmed: true });

      render(<BluetoothController bleOtherPlayer={false} />);
      const button = screen.getByRole('button');

      fireEvent.click(button);

      await waitFor(() => {
        expect(bluetoothService.disconnect).toHaveBeenCalled();
      });
    });

    it('should not call disconnect when user cancels disconnection', async () => {
      (bluetoothService.getState as jest.Mock).mockReturnValue(BleState.Connected);
      (Swal.fire as jest.Mock).mockResolvedValue({ isConfirmed: false });

      render(<BluetoothController bleOtherPlayer={false} />);
      const button = screen.getByRole('button');

      fireEvent.click(button);

      await waitFor(() => {
        expect(bluetoothService.disconnect).not.toHaveBeenCalled();
      });
    });
  });

  describe('Error and not supported states', () => {
    it('should attempt connection when in error state', async () => {
      (bluetoothService.getState as jest.Mock).mockReturnValue(BleState.Error);

      render(<BluetoothController bleOtherPlayer={false} />);
      const button = screen.getByRole('button');

      fireEvent.click(button);

      expect(bluetoothService.connect).toHaveBeenCalledWith(mockBoardId);
    });

    it('should show not supported message when clicked in NotSupported state', async () => {
      (bluetoothService.getState as jest.Mock).mockReturnValue(BleState.NotSupported);
      (Swal.fire as jest.Mock).mockResolvedValue({ isConfirmed: false });

      render(<BluetoothController bleOtherPlayer={false} />);
      const button = screen.getByRole('button');

      fireEvent.click(button);

      await waitFor(() => {
        expect(Swal.fire).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Not supported',
            text: expect.stringContaining("doesn't support Bluetooth"),
          })
        );
      });
    });
  });

  describe('LocalStorage interactions', () => {
    it('should prompt to reconnect if ble_connected is true on mount', async () => {
      localStorage.setItem('ble_connected', 'true');
      (Swal.fire as jest.Mock).mockResolvedValue({ isConfirmed: false });

      render(<BluetoothController bleOtherPlayer={false} />);

      await waitFor(() => {
        expect(Swal.fire).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Reconnect to board?',
          })
        );
      });
    });

    it('should attempt reconnection if user confirms', async () => {
      localStorage.setItem('ble_connected', 'true');
      (Swal.fire as jest.Mock).mockResolvedValue({ isConfirmed: true });

      render(<BluetoothController bleOtherPlayer={false} />);

      await waitFor(() => {
        expect(bluetoothService.connect).toHaveBeenCalledWith(mockBoardId);
      });
    });

    it('should set ble_connected to false if user declines reconnection', async () => {
      localStorage.setItem('ble_connected', 'true');
      (Swal.fire as jest.Mock).mockResolvedValue({ isConfirmed: false });

      render(<BluetoothController bleOtherPlayer={false} />);

      await waitFor(() => {
        expect(localStorage.getItem('ble_connected')).toBe('false');
      });
    });

    it('should not prompt for reconnection if ble_connected is false', async () => {
      localStorage.setItem('ble_connected', 'false');
      (Swal.fire as jest.Mock).mockResolvedValue({ isConfirmed: false });

      render(<BluetoothController bleOtherPlayer={false} />);

      // Initialize dialog should not be called for reconnection
      expect(Swal.fire).not.toHaveBeenCalled();
    });
  });

  describe('State updates from service', () => {
    it('should update component state when service state changes', async () => {
      const mockCallback = jest.fn();
      (bluetoothService.subscribe as jest.Mock).mockImplementation((listener) => {
        mockCallback(listener);
        return jest.fn();
      });

      render(<BluetoothController bleOtherPlayer={false} />);

      const subscriber = mockCallback.mock.calls[0][0];

      // Simulate state change - wrap in waitFor for React
      await waitFor(() => {
        subscriber(BleState.Connected);
      });

      const button = screen.getByRole('button');
      expect(button).toHaveClass(BleState.Connected);
    });
  });

  describe('useParams integration', () => {
    it('should use boardId from useParams', async () => {
      (useParams as jest.Mock).mockReturnValue({ boardId: 'custom-board-id' });

      render(<BluetoothController bleOtherPlayer={false} />);
      const button = screen.getByRole('button');

      fireEvent.click(button);

      expect(bluetoothService.connect).toHaveBeenCalledWith('custom-board-id');
    });

    it('should handle missing boardId gracefully', async () => {
      (useParams as jest.Mock).mockReturnValue({});

      render(<BluetoothController bleOtherPlayer={false} />);
      const button = screen.getByRole('button');

      fireEvent.click(button);

      expect(bluetoothService.connect).toHaveBeenCalledWith('');
    });

    it('should handle boardId as array', async () => {
      (useParams as jest.Mock).mockReturnValue({ boardId: ['board-1', 'board-2'] });

      render(<BluetoothController bleOtherPlayer={false} />);
      const button = screen.getByRole('button');

      fireEvent.click(button);

      expect(bluetoothService.connect).toHaveBeenCalledWith('board-1,board-2');
    });
  });

  describe('Class name handling', () => {
    it('should combine bleButton and state class', () => {
      (bluetoothService.getState as jest.Mock).mockReturnValue(BleState.Connected);
      render(<BluetoothController bleOtherPlayer={false} />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bleButton');
      expect(button.className).toContain(BleState.Connected);
    });

    it('should update class when state changes', async () => {
      const mockCallback = jest.fn();
      (bluetoothService.subscribe as jest.Mock).mockImplementation((listener) => {
        mockCallback(listener);
        return jest.fn();
      });

      (bluetoothService.getState as jest.Mock).mockReturnValue(BleState.Disconnected);
      const { rerender } = render(<BluetoothController bleOtherPlayer={false} />);

      const subscriber = mockCallback.mock.calls[0][0];
      
      await waitFor(() => {
        subscriber(BleState.Connected);
      });

      rerender(<BluetoothController bleOtherPlayer={false} />);

      const button = screen.getByRole('button');
      expect(button.className).toContain(BleState.Connected);
    });
  });

  describe('Message sending', () => {
    it('should have sendMessage available', () => {
      render(<BluetoothController bleOtherPlayer={false} />);
      expect(bluetoothService.sendMessage).toBeDefined();
    });

    it('should handle send message errors', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (bluetoothService.sendMessage as jest.Mock).mockRejectedValue(
        new Error('Send failed')
      );

      render(<BluetoothController bleOtherPlayer={false} />);

      expect(consoleErrorSpy).toBeDefined();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Bluetooth icon rendering', () => {
    it('should render material symbols bluetooth icon', () => {
      render(<BluetoothController bleOtherPlayer={false} />);

      const span = screen.getByText('bluetooth');
      expect(span).toBeInTheDocument();
      expect(span).toHaveClass('material-symbols-outlined');
    });
  });

  describe('Props behavior', () => {
    it('should respect bleOtherPlayer prop changes', () => {
      (bluetoothService.getState as jest.Mock).mockReturnValue(BleState.Disconnected);
      const { rerender } = render(<BluetoothController bleOtherPlayer={false} />);

      let button = screen.getByRole('button');
      expect(button).toHaveClass(BleState.Disconnected);

      rerender(<BluetoothController bleOtherPlayer={true} />);

      button = screen.getByRole('button');
      expect(button).toHaveClass(BleState.OtherConnected);
    });
  });
});
