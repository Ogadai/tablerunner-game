'use server'

import { ApiResponse } from "@/lib/api-response";
import { RaceInstructionTeam } from "./race-types";
import { lockPlayerActionsInRedis, setPlayerInstructionsInRedis } from "@/lib/store/redis-access";

export async function setPlayerRaceTeam(boardId: string, mapId: string, playerId: string, instructions: RaceInstructionTeam): Promise<ApiResponse<RaceInstructionTeam>> {
  let playerActionLock: (() => Promise<void>) | null = null;
  try {
    playerActionLock = await lockPlayerActionsInRedis(boardId, mapId, playerId);

    await setPlayerInstructionsInRedis(boardId, mapId, playerId, instructions);

    return {
      success: true,
      data: instructions
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    };
  } finally {
    if (playerActionLock) {
      await playerActionLock();
    }
  }
}
