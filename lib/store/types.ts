import { SetCommandOptions } from "@upstash/redis";
import { CharacterListEntry, LocationMove } from "../games/types";

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
}

export interface PlayerStateLocation {
  id: number;
  description: string;
  move: LocationMove[];
}

export interface PlayerReadyState {
  readyPlayerIds: string[];
}

