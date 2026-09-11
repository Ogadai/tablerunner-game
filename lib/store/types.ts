import { SetCommandOptions } from "@upstash/redis";
import { CharacterListEntry, LocationMove, LocationMoveDirection, BaseStats, CharacterStats, PlayerItem } from "../games/types";
import { monsters } from '../games/monsters';
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
  stores: number[];

  counters: {
    monsterId: number,
    itemId: number,
  }
  leds: LedState[];
}

export const NOTHING_EQUPPED = '<none>';

export interface PlayerInventoryEquipSlots {
  helmet?: string | null;
  armour?: string | null;
  shield?: string | null;
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

export interface ITarget {
  id: string;
  health: number;
  effects?: CharacterEffect[];
  zombie?: boolean;
  infected?: number;
}

export interface INamedTarget extends ITarget {
  name: string;
  equipment: PlayerItem[];
  equipped: PlayerInventoryEquipSlots;
  baseStats?: BaseStats;
}

export interface PlayerState extends INamedTarget {
  name: string;
  location: PlayerStateLocation;
  retreatDirection?: string;
  rgbColour: string;
  characterStats: CharacterStats;
  magic: number;
  level: number;
  points: number;
  availableStats: number;
  spells: SpellIds[];
  recentSpells?: SpellIds[];
  coins: number;
}

export interface PlayerLocationMove extends LocationMove {
  blockDescription?: string;
  keyItemType?: string;
}

export interface PlayerStateLocation {
  id: number;
  description: string;
  move: PlayerLocationMove[];
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

export interface MonsterState extends ITarget {
  type: string;
  location: number;
}

export interface ItemLocationState extends PlayerItem {
  location: number;
}

export interface LocationCoinState {
  location: number;
  coins: number
}

export interface LocationBlockedMove {
  location: number;
  direction: LocationMoveDirection;
  description: string;
  keyItemType?: string;
}

export interface StoreContentsState {
  items: { itemId: string, count: number };
}

export interface AllLocationsState {
  monsters: MonsterState[];
  items: ItemLocationState[];
  coins: LocationCoinState[];
  blockedMoves: LocationBlockedMove[];
}

export interface LocationState {
  monsters: MonsterState[];
  items: PlayerItem[];
}

export interface PlayerInventoryState {
  equipped: PlayerInventoryEquipSlots | null
  equipment: PlayerItem[] | null;
  coins?: number;
}

export interface StoreInventoryItem {
  itemId: string;
  count: number;
}

export interface StoreInventoryState {
  items: StoreInventoryItem[];
}

export interface StoreTransaction {
  buyItemTypes: string[],
  sellItemIds: string[]
}

export interface LedState {
  location: number,
  rgb: string;
  owner: string;
}

export const getDisplayName = (target: INamedTarget): string => {
  return target.zombie ? `Zombie ${target.name.split(' ')[0]}` : target.name;
}

export const getMonsterName = (monster: MonsterState): string => {
  const monsterName = monsters[monster.type].name;
  return monster.zombie ? `Zombie ${monsterName}` : monsterName;
}
