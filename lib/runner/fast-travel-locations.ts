import { Location } from '../games/types';
import { GameState, INamedTarget, MonsterState } from '../store/types';
import { getEnemies } from './game-friends-or-enemies';

export function getFastTravelLocations(
  params: { gameState: GameState; monsters: MonsterState[] },
  locations: Location[],
  player: INamedTarget,
  steps = 5,
): number[] {
  const characterDef = params.gameState.characters.find(character => character.id === player.id);
  const available = new Set<number>();
  const remainingSteps = new Map<number, number>();
  const visit = (location: Location, remaining: number) => {
    if (getEnemies(params, { ...player, location }).some(target => target.health > 0)) return;
    if ((remainingSteps.get(location.id) ?? -1) >= remaining) return;
    remainingSteps.set(location.id, remaining);

    if (player.location.id !== location.id) {
      available.add(location.id);
    }

    if (remaining <= 0) return;
    for (const move of location.move) {
      if (!params.gameState.visited.includes(move.id)) continue;
      // Monster markers describe occupants, whose teams are checked above.
      const blocked = params.gameState.leds.some(led => led.location === move.id
        && !['monster', 'portal', 'shop'].includes(led.owner)
        && !(led.owner === 'territory' && characterDef && led.rgb === characterDef.rgbColour));
      const destination = locations.find(candidate => candidate.id === move.id);
      if (!blocked && destination) visit(destination, remaining - 1);
    }
  };
  visit(player.location, steps);
  return [...available];
}
