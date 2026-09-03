import { BaseStats } from '../games/types';
import { PlayerState } from './types';

export function getPlayerStats(playerState: PlayerState): BaseStats {
  return {
    attack: playerState.characterStats.strength,
    damage: playerState.characterStats.strength,
    defence: playerState.characterStats.reactions,
    magic: playerState.characterStats.intelligence,
    health: playerState.characterStats.resiliance,
    speed: playerState.characterStats.reactions,
  };
}
