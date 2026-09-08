import { monsters } from "../games/monsters";
import { SpellIds } from "../games/spells";
import { SpellDef } from "../games/types";
import { CharacterEffect, ITarget, MonsterState, PlayerState } from "../store/types";
import { BaseParams } from "./base-params";
import { playerMessageAtLocation } from "./game-messages";

export const specialSpellActions: Record<string, (params: BaseParams, player: PlayerState, spell: SpellDef, targets: ITarget[]) => void> = {
  [SpellIds.fear]: (params: BaseParams, player: PlayerState, spell: SpellDef, targets: ITarget[]) =>
    applyFearEffect(params, player, targets),
  [SpellIds.terror]: (params: BaseParams, player: PlayerState, spell: SpellDef, targets: ITarget[]) =>
    applyTerrorEffect(params, player, targets),
};

const applyFearEffect = (params: BaseParams, player: PlayerState, targets: ITarget[]) => {
  addEffectToTargets(targets, {
    turns: 3,
    description: 'Fear',
    attack: -2,
    defence: -2,
  });

  const targetNames = targets
    .map(m => monsters[(m as MonsterState).type].name)
    .join(', ');

  playerMessageAtLocation(params, player.id,
    `**{player}** cast **Fear** on **${targetNames}**`);
}

const applyTerrorEffect = (params: BaseParams, player: PlayerState, targets: ITarget[]) => {
  addEffectToTargets(targets, {
    turns: 2,
    description: 'Fear',
    attack: -2,
    defence: -2,
  });

  playerMessageAtLocation(params, player.id,
    `**{player}** cast **Terror**`);
}

const addEffectToTargets = (targets: ITarget[], newEffect: CharacterEffect) => {
  for(const target of targets) {
    target.effects = [
      ...(target.effects || [])
        .filter(e => e.defence !== newEffect.defence),
      { ...newEffect },
    ];
  }
}
