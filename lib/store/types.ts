import { SetCommandOptions } from "@upstash/redis";

export const Expiry1Day = 60 * 60 * 24;
export const Expiry1Week = Expiry1Day * 7;

export const gameStateOptions: SetCommandOptions = { ex: Expiry1Week };

export interface GameState {
  name: string;
}
