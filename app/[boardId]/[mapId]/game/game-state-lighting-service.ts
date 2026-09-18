import { GameState } from '@/lib/store/types';
import { bluetoothService } from '../../../ble/bluetooth-service';
import { BleState } from '@/app/ble/ble-states';
import { getBoardSettings } from '@/lib/store/gameState';

const totalLocations = 240;
const visitedRGB = '707070';

class GameStateLightingService {
  private subscribed = false;
  private boardId: string | undefined;
  private mapId: string | undefined;
  private lastGameState: GameState | undefined;

  constructor() {
    this.initialiseSubscription();
  }

  async update(boardId: string, mapId: string, gameState: GameState | undefined) {
    const boardChanged = (this.boardId !== boardId) || (this.mapId !== boardId);
    this.boardId = boardId;
    this.mapId = boardId;
    this.lastGameState = gameState;

    if (bluetoothService.getState() === BleState.Connected) {
      if (boardChanged) {
        await this.applySettings();
      }
      await this.applyLighting(gameState);
    }
  }

  async initialiseSubscription() {
    if (!this.subscribed) {
      bluetoothService.subscribe(async (state) => {
        if (state === BleState.Connected) {
          await this.applySettings();
          await this.applyLighting(this.lastGameState);
        }
      })

      this.subscribed = true;
    }
  }

  private async applySettings() {
    if (this.boardId && this.mapId) {
      const result = await getBoardSettings(this.boardId, this.mapId);
      if (result.success && result.data) {
        if (result.data && result.data.brightness > 0) {
          await bluetoothService.setBrightness(result.data.brightness);
        }
      }
    }
  }

  private async applyLighting(gameState: GameState | undefined) {
    await this.locationsLighting(gameState);
    await this.playerLocationsAnimation(gameState);
  }

  private async locationsLighting(gameState: GameState | undefined) {
    const litLocations: number[] = [];

    if (gameState) {
      await bluetoothService.setColourForLeds(gameState.visited, visitedRGB);
      litLocations.push(...gameState.visited);

      if (gameState.leds.length > 0) {
        await bluetoothService.setColourPerLed(
          gameState.leds.map(l => ({ led: l.location - 1, rgb: l.rgb }))
        )
        litLocations.push(...gameState.leds.map(l => l.location));
      }
    }

    const unlitLocations: number[] = [];
    for(let n = 1; n <= totalLocations; n++) {
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
