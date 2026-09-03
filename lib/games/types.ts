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
  defaultName: string;
  description: string;
  image: string;
  icon: string;
  rgbColour: string;
  characterStats: CharacterStats;
  equipment: PlayerItem[];
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
  consumable = 'consumable'
}

export interface PlayerItem {
  id: string;
  type: PlayerItemType;
  name: string;
  icon: string;
}

export interface PlayerEquipableItem extends PlayerItem {
  ranged?: boolean;
  bonusStats: {
    attack?: number;
    damage?: number;
    defence?: number;
    magic?: number;
    health?: number;
    speed?: number;
  };
}
