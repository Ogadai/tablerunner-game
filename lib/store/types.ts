import { SetCommandOptions } from "@upstash/redis";
import { CharacterListEntry, LocationMove, LocationMoveDirection, BaseStats, CharacterStats, PlayerItem } from "../games/types";
import { SpellIds } from "../games/spells";

export const Expiry1Day = 60 * 60 * 24;
export const Expiry1Week = Expiry1Day * 7;

export const gameStateOptions: SetCommandOptions = { ex: Expiry1Week };

export interface GameState {
  gameId: string;
  name: string;
  characters: CharacterListEntry[];
  players: PlayerState[];
  visited: number[];

  counters: {
    monsterId: number,
    itemId: number,
  }
}

export const NOTHING_EQUPPED = '<none>';

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

export interface CharacterEffect {
  description: string;
  attack?: number;
  damage?: number;
  defence?: number;
  speed?: number;
  special?: string;
  turns: number;
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
  magic: number;
  level: number;
  points: number;
  availableStats: number;
  equipment: PlayerItem[];
  equipped: PlayerInventoryEquipSlots;
  spells: SpellIds[];
  recentSpells?: SpellIds[];
  zombie?: boolean;
  effects?: CharacterEffect[];
  coins: number;
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
  Cast = 'Cast',
  ReadScroll = 'ReadScroll',
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
}

export interface PlayerActionCast extends PlayerAction {
  type: PlayerActionType.Cast,
  spellId: string;
  targetId?: string;
}

export interface PlayerActionReadScroll extends PlayerAction {
  type: PlayerActionType.ReadScroll,
  itemId: string;
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

  // TODO: Monsters can also have effects
  effects?: CharacterEffect[];
}

export interface ItemLocationState extends PlayerItem {
  location: number;
}

export interface LocationCoinState {
  location: number;
  coins: number
}

export interface AllLocationsState {
  monsters: MonsterState[];
  items: ItemLocationState[];
  coins: LocationCoinState[];
}

export interface LocationState {
  monsters: MonsterState[];
  items: PlayerItem[];
}

export interface PlayerInventoryState {
  equipped: PlayerInventoryEquipSlots | null
  equipment: PlayerItem[] | null;
}
