import { monsters } from '../games/monsters';
import { INamedTarget, MonsterState } from '../store/types';
import { getMonsterStats } from './monster-stats';

/** A live combat view, never an NPC or a separately persisted copy. */
export function getMonsterCombatant(monster: MonsterState): INamedTarget {
  return {
    id: monster.id,
    get name() { return monsters[monster.type].name; },
    get location() { return { id: monster.location, description: '', move: [] }; },
    get baseStats() { return getMonsterStats(monster); },
    get health() { return monster.health; },
    set health(value) { monster.health = value; },
    get magic() { return monster.magic ?? getMonsterStats(monster).magic; },
    set magic(value) { monster.magic = value; },
    get spells() { return monster.spells ?? monsters[monster.type].spells ?? []; },
    get recentSpells() { return monster.recentSpells; },
    set recentSpells(value) { monster.recentSpells = value; },
    get equipment() { return monster.equipment ?? []; },
    set equipment(value) { monster.equipment = value; },
    get equipped() { return monster.equipped ?? {}; },
    get effects() { return monster.effects; },
    set effects(value) { monster.effects = value; },
    get zombie() { return monster.zombie; },
    set zombie(value) { monster.zombie = value; },
  };
}
