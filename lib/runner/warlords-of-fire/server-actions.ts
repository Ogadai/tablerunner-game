'use server'

import { ApiResponse } from "@/lib/api-response";
import { WarlordInstruction, WarlordInstructionRecruit } from "./warlords-types";
import { getPlayerInstructionsFromRedis, lockPlayerActionsInRedis, setPlayerInstructionsInRedis } from "@/lib/store/redis-access";

const DEFAULT_INSTRUCTIONS: WarlordInstruction = {
  recruit: [],
};

export async function getPlayerWarlordInstructions(boardId: string, mapId: string, playerId: string): Promise<ApiResponse<WarlordInstruction>> {
  try {
    const data = await getPlayerInstructionsFromRedis(boardId, mapId, playerId) as WarlordInstruction;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function warlordRecruitMonster(boardId: string, mapId: string, playerId: string, recruit: WarlordInstructionRecruit): Promise<ApiResponse<WarlordInstruction>> {
  let playerActionLock: (() => Promise<void>) | null = null;
  try {
    playerActionLock = await lockPlayerActionsInRedis(boardId, mapId, playerId);
    const data = await getPlayerInstructionsFromRedis(boardId, mapId, playerId) as WarlordInstruction;
    const instructions = data || DEFAULT_INSTRUCTIONS;

    instructions.recruit.push(recruit);

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
