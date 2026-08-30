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
}

export type LocationMoveDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

export interface LocationMove {
  direction: LocationMoveDirection;
  id: number;
}

export interface Location {
  id: number;
  description: string;
  move: LocationMove[];
}