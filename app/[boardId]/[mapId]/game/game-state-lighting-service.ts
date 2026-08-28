import { GameState } from '@/lib/store/types';
import { bluetoothService } from '../../../ble/bluetooth-service';
import { BleState } from '@/app/ble/ble-states';

const totalLocations = 240;
class GameStateLightingService {
  private subscribed = false;
  private lastGameState: GameState | undefined;

  constructor() {
    this.initialiseSubscription();
  }

  async update(gameState: GameState | undefined) {
    this.lastGameState = gameState;

    if (bluetoothService.getState() === BleState.Connected) {
      await this.applyLighting(gameState);
    }
  }

  async initialiseSubscription() {
    if (!this.subscribed) {
      bluetoothService.subscribe(async (state) => {
        if (state === BleState.Connected) {
          await bluetoothService.runWelcome();
          await this.applyLighting(this.lastGameState);
        }
      })

      this.subscribed = true;
    }
  }

  private async applyLighting(gameState: GameState | undefined) {
    const litLocations: number[] = [];

    if (gameState) {
      await bluetoothService.setColourForLeds(gameState.visited, 'ffffff');
      litLocations.push(...gameState.visited);
    }

    const unlitLocations: number[] = [];
    for(let n = 0; n < totalLocations; n++) {
      if (!litLocations.includes(n)) {
        unlitLocations.push(n);
      }
    }

    await bluetoothService.setColourForLeds(unlitLocations, '000000');
  }
}

const gameStateLightingService = new GameStateLightingService();

export default gameStateLightingService;
