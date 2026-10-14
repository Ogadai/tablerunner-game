'use server'

import { ApiResponse } from "@/lib/api-response";
import { WarlordInstruction, WarlordInstructionRecruit } from "./warlords-types";
import { getGameStateFromRedis, getLocationsStateFromRedis, getPlayerInstructionsFromRedis, getPlayerInventoryFromRedis, lockGameStateInRedis, lockLocationsStateInRedis, lockPlayerActionsInRedis, setLocationsStateInRedis, setPlayerInstructionsInRedis, setPlayerInventoryInRedis } from "@/lib/store/redis-access";
import { PlayerInventoryState } from "@/lib/store/types";
import { getState } from './territory-state';

const DEFAULT_INSTRUCTIONS: WarlordInstruction = {
  recruit: [],
};

export async function warlordAllocateCoins(boardId: string, mapId: string, playerId: string, teamCoins: number): Promise<ApiResponse<PlayerInventoryState>> {
  let gameStateLock: (() => Promise<void>) | null = null;
  try {
    gameStateLock = await lockGameStateInRedis(boardId, mapId);
    const gameState = await getGameStateFromRedis(boardId, mapId);
    const player = gameState?.players.find(player => player.id === playerId);
    if (gameState?.gameId !== 'warlordsfire' || !player) {
      throw new Error('Coin allocation is only available to Warlords players');
    }
    if (player.health <= 0) {
      throw new Error('Cannot allocate coins while dead');
    }

    const team = getState(gameState).teams[player.team || player.id];
    if (!team) throw new Error('Team is not available');
    const inventory = await getPlayerInventoryFromRedis(boardId, mapId, playerId);
    const personalCoins = inventory.coins ?? player.coins;
    const previousTransfer = inventory.teamCoinTransfer ?? 0;
    const change = teamCoins - (team.coins + previousTransfer);
    if (!Number.isSafeInteger(teamCoins) || teamCoins < 0 || change > personalCoins) {
      throw new Error('Coin allocation must be within the available balance');
    }

    const updatedInventory: PlayerInventoryState = {
      ...inventory,
      coins: personalCoins - change,
      teamCoinTransfer: previousTransfer + change,
    };
    await setPlayerInventoryInRedis(boardId, mapId, playerId, updatedInventory);
    return { success: true, data: updatedInventory };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  } finally {
    if (gameStateLock) await gameStateLock();
  }
}

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
    if (!instructions.recruit) {
      instructions.recruit = [];
    }

    const nextId = Math.max(0, ...instructions.recruit.map(r => r.recruitId || 0)) + 1;

    instructions.recruit.push({
      ...recruit,
      recruitId: nextId,
  });

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

export async function warlordRecruitCancel(boardId: string, mapId: string, playerId: string, recruitId: number): Promise<ApiResponse<WarlordInstruction>> {
  let playerActionLock: (() => Promise<void>) | null = null;
  try {
    playerActionLock = await lockPlayerActionsInRedis(boardId, mapId, playerId);
    const data = await getPlayerInstructionsFromRedis(boardId, mapId, playerId) as WarlordInstruction;
    const instructions = data || DEFAULT_INSTRUCTIONS;

    instructions.recruit = instructions.recruit.filter(r => r.recruitId !== recruitId);

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

export async function warlordEditParty(boardId: string, mapId: string, playerId: string, monsterId: string, inParty: boolean): Promise<ApiResponse<void>> {
  let gameStateLock: (() => Promise<void>) | null = null;
  let locationsLock: (() => Promise<void>) | null = null;
  try {
    gameStateLock = await lockGameStateInRedis(boardId, mapId);
    locationsLock = await lockLocationsStateInRedis(boardId, mapId);
    const [gameState, locationsState] = await Promise.all([
      getGameStateFromRedis(boardId, mapId),
      getLocationsStateFromRedis(boardId, mapId),
    ]);
    const player = gameState?.players.find(p => p.id === playerId);
    const monster = locationsState.monsters.find(m => m.id === monsterId);
    if (!player || !monster || monster.location !== player.location.id) {
      throw new Error('Monster is not available at this location');
    }
    if (player.team === null || monster.team !== player.team) {
      throw new Error('Monster must be on your team');
    }
    if (player.health <= 0 || monster.health <= 0) {
      throw new Error('Player and monster must be alive to edit the party');
    }
    if (monster.masterId && monster.masterId !== playerId) {
      throw new Error('Monster is already in another player\'s party');
    }

    if (inParty) {
      monster.masterId = playerId;
    } else {
      delete monster.masterId;
    }
    await setLocationsStateInRedis(boardId, mapId, locationsState);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  } finally {
    if (locationsLock) {
      await locationsLock();
    }
    if (gameStateLock) {
      await gameStateLock();
    }
  }
}
