'use server'

import { ApiResponse } from "../api-response";

export async function saveGameToBlob(boardId: string, mapId: string, saveName: string): Promise<ApiResponse<void>> {
  try {


    return {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    };
  }
}