import { GameState } from "../store/types";

export const MONSTER_LED_OWNER = 'monster';
export const MONSTER_LED_RGB = 'FF8000';

export function updateMonsterLeds(gameState: GameState, monsters: { location: number, health: number }[]) {
  const monsterLocations = [...new Set(
    monsters
      .filter(monster => gameState.visited.includes(monster.location) && monster.health > 0)
      .map(monster => monster.location)
  )];
  const monsterLeds = monsterLocations.map(location => ({
    location,
    rgb: MONSTER_LED_RGB,
    owner: MONSTER_LED_OWNER,
  })).filter(ml => !gameState.leds.some(l => l.owner !== MONSTER_LED_OWNER && l.location === ml.location));

  gameState.leds = [
    ...gameState.leds.filter(l => l.owner !== MONSTER_LED_OWNER),
    ...monsterLeds,
  ];
}
