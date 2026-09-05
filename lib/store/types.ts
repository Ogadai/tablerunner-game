import { SetCommandOptions } from "@upstash/redis";
import { CharacterListEntry, LocationMove, LocationMoveDirection, BaseStats, CharacterStats, PlayerItem } from "../games/types";

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

export interface PlayerInventoryEquipSlots {
  helmet?: string | null;
  armour?: string | null;
  weapon?: string | null;
  gloves?: string | null;
  boots?: string | null;
  belt?: string | null;
  ring?: string | null;
  necklace?: string | null;
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
  level: number;
  points: number;
  availableStats: number;
  equipment: PlayerItem[];
  equipped: PlayerInventoryEquipSlots
}

export interface PlayerStateLocation {
  id: number;
  description: string;
  move: LocationMove[];
}

export interface PlayerReadyState {
  readyPlayerIds: string[];
}

export interface PlayerAddStatsState {
  characterStats: CharacterStats | null;
}

export enum PlayerActionType {
  Move = 'move',
  Attack = 'attack',
  UseItem = 'useItem',
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

export interface PlayerActionUseItem extends PlayerAction {
  type: PlayerActionType.UseItem,
  itemId: string;
  uniqueId?: string;
}

export interface PlayerActionsState {
  actions: PlayerAction[];
}

export interface PlayerMessage {
  text: string
}

export interface PlayerMessagesState {
  messages: PlayerMessage[];
}

export interface MonsterState {
  id: string;
  type: string;
  location: number;
  health: number;
}

export interface ItemLocationState extends PlayerItem {
  location: number;
}

export interface AllLocationsState {
  monsters: MonsterState[];
  items: ItemLocationState[];
}

export interface LocationState {
  monsters: MonsterState[];
  items: PlayerItem[];
}

export interface PlayerInventoryState {
  equipped: PlayerInventoryEquipSlots | null
  equipment: PlayerItem[] | null;
}
