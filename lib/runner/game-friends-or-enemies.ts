import { GameState, INamedTarget, ITarget, MonsterState } from "../store/types";
import { getMonsterCombatant } from "./monster-combatant";

export function isEnemy(actor: ITarget, target: ITarget): boolean {
  return actor.team !== target.team;
}

export function isFriend(actor: ITarget, target: ITarget): boolean {
  return actor.team === target.team;
}

export function getEnemies(params: { gameState: GameState, monsters: MonsterState[] }, actor: INamedTarget): INamedTarget[] {
  return getAll(params, actor).filter(n => isEnemy(n, actor));
}

export function getFriends(params: { gameState: GameState, monsters: MonsterState[] }, actor: INamedTarget): INamedTarget[] {
  return getAll(params, actor).filter(n => isFriend(n, actor));
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
