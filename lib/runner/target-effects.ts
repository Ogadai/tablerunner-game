import { CharacterEffect, ITarget } from '../store/types';

/** Applies a status effect to targets, replacing any existing effect with the same description. */
export function addEffectToTargets(targets: ITarget[], newEffect: CharacterEffect): void {
  for (const target of targets) {
    target.effects = [
      ...(target.effects || [])
        .filter(e => e.description !== newEffect.description),
      { ...newEffect },
    ];
  }
}
