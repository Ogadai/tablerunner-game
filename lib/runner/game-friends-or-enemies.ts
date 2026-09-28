import { GameState, INamedTarget, MonsterState } from "../store/types";
import { getMonsterCombatant } from "./monster-combatant";

export function getEnemies(params: { gameState: GameState, monsters: MonsterState[] }, actor: INamedTarget): INamedTarget[] {
  return getAll(params, actor).filter(a => a.team !== actor.team);
}

export function getFriends(params: { gameState: GameState, monsters: MonsterState[] }, actor: INamedTarget): INamedTarget[] {
  return getAll(params, actor).filter(a => a.team === actor.team);
}

function getAll(params: { gameState: GameState, monsters: MonsterState[] }, actor: INamedTarget): INamedTarget[] {
  const filterNamedTarget = (target: INamedTarget): boolean =>
      target.id !== actor.id && target.location.id === actor.location.id;
  
  const filterMonster = (monster: MonsterState): boolean =>
      monster.id !== actor.id && monster.location !== actor.location.id;

  return [
    ...params.gameState.players.filter(filterNamedTarget),
    ...params.gameState.npcs.filter(filterNamedTarget),
    ...params.monsters.filter(filterMonster).map(getMonsterCombatant)
  ]
}
