'use server'

import { ApiResponse } from "@/lib/api-response";
import { RaceInstructionTeam, RaceTeamSelections } from "./race-types";
import { getGameStateFromRedis, getPlayersInstructionsFromRedis, lockPlayerActionsInRedis, setPlayerInstructionsInRedis } from "@/lib/store/redis-access";
import { GameTopicMessageType, type RaceTeamUpdatedMessage } from "@/lib/message-types";
import { publishMessage } from "@/lib/messages/message-publisher";

export async function getPlayerRaceTeams(boardId: string, mapId: string): Promise<ApiResponse<RaceTeamSelections>> {
  try {
    const gameState = await getGameStateFromRedis(boardId, mapId);
    if (!gameState || gameState.gameId !== 'racefire') {
      return { success: false, error: 'Race of Fire game not found.' };
    }
    const state = gameState.processState['crystal-shard'] as {
      blueTeam?: string[];
      redTeam?: string[];
    } | undefined;
    const playerInstructions = await getPlayersInstructionsFromRedis(boardId, mapId, gameState.players.map(player => player.id));
    const selections = gameState.players.map(player => {
      const instructions = playerInstructions[player.id] as RaceInstructionTeam;
      const team = Object.hasOwn(instructions, 'team') ? instructions.team ?? null
        : state?.blueTeam?.includes(player.id) ? 'blue'
        : state?.redTeam?.includes(player.id) ? 'red' : null;
      return [player.id, team] as const;
    });
    return { success: true, data: Object.fromEntries(selections) };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function setPlayerRaceTeam(boardId: string, mapId: string, playerId: string, instructions: RaceInstructionTeam): Promise<ApiResponse<RaceInstructionTeam>> {
  let playerActionLock: (() => Promise<void>) | null = null;
  try {
    playerActionLock = await lockPlayerActionsInRedis(boardId, mapId, playerId);

    await setPlayerInstructionsInRedis(boardId, mapId, playerId, instructions);

    // A notification failure must not turn a saved selection into a failed save.
    try {
      const message: RaceTeamUpdatedMessage = {
        type: GameTopicMessageType.RaceTeamUpdated,
        playerId,
        team: instructions.team ?? null,
      };
      await publishMessage(boardId, mapId, message);
    } catch (error) {
      console.error('Failed to publish race team update', error);
    }

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
