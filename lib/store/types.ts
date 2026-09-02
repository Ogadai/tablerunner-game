import { SetCommandOptions } from "@upstash/redis";
import { CharacterListEntry, LocationMove, LocationMoveDirection, BaseStats, CharacterStats } from "../games/types";

export const Expiry1Day = 60 * 60 * 24;
export const Expiry1Week = Expiry1Day * 7;

export const gameStateOptions: SetCommandOptions = { ex: Expiry1Week };

export interface GameState {
  gameId: string;
  name: string;
  characters: CharacterListEntry[];
  players: PlayerState[];
  visited: number[];
}

export interface PlayerState {
  id: string;
  name: string;
  location: PlayerStateLocation;
  retreatDirection?: string;
  rgbColour: string;
  baseStats?: BaseStats;
  characterStats: CharacterStats;
  health: number;
}

export interface PlayerStateLocation {
  id: number;
  description: string;
  move: LocationMove[];
}

export interface PlayerReadyState {
  readyPlayerIds: string[];
}

export enum PlayerActionType {
  Move = 'move',
  Attack = 'attack'
}

export interface PlayerAction {
  id: number;
  type: PlayerActionType
  description: string;
}

export interface PlayerActionMove extends PlayerAction {
  type: PlayerActionType.Move,
  direction: LocationMoveDirection;
}

export interface PlayerActionAttack extends PlayerAction {
  type: PlayerActionType.Attack,
  target: string;
}

export interface PlayerActionsState {
  actions: PlayerAction[];
}

export interface MonsterState {
  id: string;
  type: string;
  location: number;
  health: number;
}

export interface AllMonsterState {
  monsters: MonsterState[];
}

export interface LocationState {
  monsters: MonsterState[];
}
