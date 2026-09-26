import type { BaseStats } from '@/lib/games/types';
import type { NPCState, PlayerState } from '@/lib/store/types';
import { makePlayer as makeGamePlayer } from '../game/test-fixtures';
import { EntityItemClass, type EntityItemDetail } from './entity-list';
import type { PlayerStats } from './player-stats-sync.service';

export { makeGameState } from '../game/test-fixtures';

export function makeBaseStats(overrides: Partial<BaseStats> = {}): BaseStats {
  return { health: 20, magic: 10, attack: 5, defence: 4, damage: 3, speed: 10, ...overrides };
}

export function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return makeGamePlayer({ baseStats: makeBaseStats(), ...overrides });
}

export function makeStats(overrides: Partial<PlayerStats> = {}): PlayerStats {
  return {
    baseStats: makeBaseStats(), health: 10, magic: 10,
    actionsPerTurn: { attack: 3, move: 2, total: 10 },
    actionPointsUsed: 0, actionPointsTotal: 10, availablePoints: 0,
    magicUsed: 0, magicLeft: 10, isAttacking: false, playerCanMove: true,
    ...overrides,
  };
}

export function makeEntity(overrides: Partial<EntityItemDetail> = {}): EntityItemDetail {
  return {
    id: 'enemy-1', name: 'Enemy', iconXY: { x: 0, y: 0 },
    className: EntityItemClass.enemy, health: 10, maxHealth: 10, ...overrides,
  };
}

export function makeNpc(overrides: Partial<NPCState> = {}): NPCState {
  return { id: 'npc-1', name: 'Mercenary', health: 10, magic: 0,
    location: { id: 1, description: 'Start', move: [] }, equipment: [], equipped: {},
    spells: [], baseStats: makeBaseStats(), masterId: null,
    hireCost: 10, iconXY: { x: 0, y: 0 }, ...overrides };
}
