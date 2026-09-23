import { SpellDef, SpellTargetType } from '../games/types';
import { INamedTarget, MonsterState } from '../store/types';
import { BaseParams } from './base-params';

export function isMonsterCaster(params: BaseParams, caster: INamedTarget): boolean {
  return params.monsters.some(monster => monster.id === caster.id);
}

/** Shared by planning and execution; even selected targets must be local. */
export function getAvailableSpellTargets(params: BaseParams, caster: INamedTarget, spell: SpellDef): (INamedTarget | MonsterState)[] {
  const alive = spell.targetType !== SpellTargetType.corpse;
  const monsterTargets = params.monsters.filter(m => m.location === caster.location.id && (m.health > 0) === alive);
  const characterTargets = [...params.gameState.players, ...params.gameState.npcs]
    .filter(t => t.location.id === caster.location.id && (t.health > 0) === alive);
  if (!alive) return [...monsterTargets, ...characterTargets];
  const monsterSide = isMonsterCaster(params, caster);
  const targetMonsterSide = spell.targetType === SpellTargetType.friend ? monsterSide : !monsterSide;
  return targetMonsterSide ? monsterTargets : characterTargets;
}
