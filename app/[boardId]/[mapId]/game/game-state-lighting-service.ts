import { GameState } from '@/lib/store/types';
import { bluetoothService } from '../../../ble/bluetooth-service';
import { BleState } from '@/app/ble/ble-states';
import { games } from '@/lib/games/games';

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
          await this.applyLighting(this.lastGameState);
        }
      })

      this.subscribed = true;
    }
  }

  private async applyLighting(gameState: GameState | undefined) {
    await this.locationsVisitedLighting(gameState);
    await this.playerLocationsAnimation(gameState);
  }

  private async locationsVisitedLighting(gameState: GameState | undefined) {
    const litLocations: number[] = [];

    if (gameState) {
      await bluetoothService.setColourForLeds(gameState.visited, '404040');
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

  private async playerLocationsAnimation(gameState: GameState | undefined) {
    const locationColours: {
      [location: string]: string[]
    } = {};

    if (gameState) {
      for(const player of gameState?.players) {
        const ledStr = `${player.location.id}`;
        if (!locationColours[ledStr]) {
          locationColours[ledStr] = [];
        }
        locationColours[player.location.id].push(player.rgbColour);
      }

      const padColours = (rgbColours: string[]): string[] => {
        if (rgbColours.length === 1) {
          return [...rgbColours, '000000'];
        }
        return rgbColours;
      }

      const ledDefs = Object.keys(locationColours).map(led => ({
        leds: [parseInt(led, 10)],
        rgbColours: padColours(locationColours[led])
      }));

      await bluetoothService.setAnimationForLeds(ledDefs);
    }
  }
}

const gameStateLightingService = new GameStateLightingService();

export default gameStateLightingService;
