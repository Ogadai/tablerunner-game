import { SpellIds } from "./spells";

export interface GameListEntry {
  map: string;
  id: string;
  name: string;
  description: string;
  heroImage: string;
  characters: CharacterListEntry[];
  locations: Location[];
  startLocation: number;
}

export interface CharacterListEntry {
  id: string;
  prompt: string;
  description: string;
  image: string;
  icon: string;
  rgbColour: string;
  characterStats: CharacterStats;
  equipment: ItemDef[];
  spells: SpellIds[];
}

export type LocationMoveDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
export const OPPOSITE_DIRECTION = {
  n: 's',
  ne: 'sw',
  e: 'w',
  se: 'nw',
  s: 'n',
  sw: 'ne',
  w: 'e',
  nw: 'se'
};

export interface LocationMove {
  direction: LocationMoveDirection;
  id: number;
}

export interface Location {
  id: number;
  description: string;
  move: LocationMove[];
}

export interface CharacterStats {
  strength: number;
  skill: number;
  reactions: number;
  resiliance: number;
  intelligence: number;
}

export interface BaseStats {
  attack: number;
  damage: number;
  defence: number;
  magic: number;
  health: number;
  speed: number;
  
  bonuses?: BaseStats;
}

export interface MonsterListEntry {
  id: string;
  name: string;
  image: string;
  icon: string;
  baseStats: BaseStats;
}

export enum PlayerItemType {
  weapon = 'weapon',
  armour = 'armour',
  helmet = 'helmet',
  gloves = 'gloves',
  boots = 'boots',
  belt = 'belt',
  ring = 'ring',
  necklace = 'necklace',
  consumable = 'consumable',
  miscellanous = 'miscellanous',
}

export interface ItemDef {
  id: string;
  type: PlayerItemType;
  name: string;
  iconXY: { x: number, y: number };
  iconScale?: number;
  value?: number;
  bonusStats?: {
    attack?: number;
    damage?: number;
    defence?: number;
    magic?: number;
    health?: number;
    speed?: number;
    special?: string;
  };
}

export interface EquipableItemDef extends ItemDef {
  ranged?: boolean;
  staff?: boolean;
}

export interface ConsumableItemDef extends ItemDef {
  useCost: number;
  turns?: number;
}

export interface PlayerItem {
  id: string
  type: string;
}

export enum SpellTargetType {
  friend = 'friend',
  enemy = 'enemy',
  corpse = 'corpse',
}

export interface SpellDef {
  id: string;
  name: string;
  pickTarget: boolean;
  targetType: SpellTargetType;
  intelligence: number,
  magicCost: number,
  actionCost: number,
  iconXY: { x: number, y: number };
  bonusStats?: {
    attack?: number;
    damage?: number;
    defence?: number;
    magic?: number;
    health?: number;
    speed?: number;
    special?: string;
  };
}
