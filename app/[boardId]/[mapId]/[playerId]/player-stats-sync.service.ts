'use client';

import { ApiResponse } from "@/lib/api-response";
import { BaseStats } from "@/lib/games/types";
import { getPlayerActionsState } from "@/lib/store/playerActionsState";
import { getPlayerInventory } from "@/lib/store/playerInventory";
import { getPlayerActionsCosts, getPlayerActionsMagic, getPlayerActionsPerTurn, getPlayerStats, PlayerActionsPerTurn } from "@/lib/store/playerStats";
import { getPlayerAddStatsState } from "@/lib/store/playerStatsState";
import { PlayerActionsState, PlayerActionType, PlayerAddStatsState, PlayerInventoryState, PlayerState } from "@/lib/store/types";

export interface PlayerStats {
  baseStats: BaseStats;
  health: number;
  magic: number;
  actionsPerTurn: PlayerActionsPerTurn;
  actionPointsUsed: number;
  actionPointsTotal: number;
  availablePoints: number;
  magicUsed: number;
  magicLeft: number;
  isAttacking: boolean;
  playerCanMove: boolean;
};

export const emptyPlayerStats: PlayerStats = {
  baseStats: {
    attack: 0,
    defence: 0,
    magic: 0,
    damage: 0,
    health: 0,
    speed: 0,
  },
  health: 0,
  magic: 0,
  actionsPerTurn: { attack: 0, move: 0, total: 0 },
  actionPointsUsed: 0,
  actionPointsTotal: 0,
  availablePoints: 0,
  magicUsed: 0,
  magicLeft: 0,
  isAttacking: false,
  playerCanMove: false,
};

type PlayerStatsListener = (
  playerStats: PlayerStats,
  actionsState: PlayerActionsState,
  addStatsState: PlayerAddStatsState | null,
  activePlayer: PlayerState | null
) => void;

class PlayerStatsSyncService {
  private statsPromise: Promise<PlayerStats> = Promise.resolve(emptyPlayerStats);

  private boardId: string = '';
  private mapId: string = '';
  private player: PlayerState | null = null;

  private inventoryState: PlayerInventoryState | null = null;
  private actionsState: PlayerActionsState | null = null;
  private addStatsState: PlayerAddStatsState | null = null;

  private readonly listeners = new Set<PlayerStatsListener>();

  getStats(): Promise<PlayerStats> {
    return this.statsPromise;
  }

  getActionsState(): Promise<PlayerActionsState> {
    return this.statsPromise.then(() => this.actionsState || { actions: [] });
  }

  getAddStateState(): Promise<PlayerAddStatsState | null> {
    return this.statsPromise.then(() => this.addStatsState || null);
  }

  updatePlayer(boardId: string, mapId: string, player: PlayerState): void {
    this.boardId = boardId;
    this.mapId = mapId;
    this.player = player;
    this.inventoryState = null;
    this.actionsState = null;
    this.addStatsState = null;
    this.statsPromise = this.getUpdatedStats();
  }

  updateInventory(inventoryState: PlayerInventoryState | undefined): void {
    this.inventoryState = inventoryState || { equipment: [], equipped: {} };
    this.statsPromise = this.getUpdatedStats();
  }

  updateActionsState(actionsState: PlayerActionsState): void {
    this.actionsState = actionsState;
    this.statsPromise = this.getUpdatedStats();
  }

  updateAddStatsState(addStatsState: PlayerAddStatsState): void {
    this.addStatsState = addStatsState;
    this.statsPromise = this.getUpdatedStats();
  }

  subscribe(listener: PlayerStatsListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private async getUpdatedStats(): Promise<PlayerStats> {
    if (!this.player) return emptyPlayerStats;

    const [inventoryState, actionsState, addStatsState] = (await Promise.all([
      this.getData(this.inventoryState, () => getPlayerInventory(this.boardId, this.mapId, this.player!.id)),
      this.getData(this.actionsState, () => getPlayerActionsState(this.boardId, this.mapId, this.player!.id)),
      this.getData(this.addStatsState, () => getPlayerAddStatsState(this.boardId, this.mapId, this.player!.id)),
    ]));

    this.inventoryState = inventoryState || null;
    this.actionsState = actionsState || null;
    this.addStatsState = addStatsState || null;

    const combinedPlayer: PlayerState = {
      ...this.player,
      equipped: inventoryState?.equipped ? {
        ...this.player.equipped,
        ...inventoryState.equipped
      } : { ...this.player.equipped },
      equipment: inventoryState?.equipment !== null && inventoryState?.equipment !== undefined
          ? inventoryState.equipment : this.player.equipment,
      coins: inventoryState?.coins !== undefined ? inventoryState.coins : this.player.coins,
    };

    const addedStats = addStatsState?.characterStats;
    const effectivePlayer: PlayerState = {
      ...combinedPlayer,
      characterStats: addedStats ? {
        strength: combinedPlayer.characterStats.strength + addedStats.strength,
        skill: combinedPlayer.characterStats.skill + addedStats.skill,
        intelligence: combinedPlayer.characterStats.intelligence + addedStats.intelligence,
        resiliance: combinedPlayer.characterStats.resiliance + addedStats.resiliance,
        reactions: combinedPlayer.characterStats.reactions + addedStats.reactions,
      } : combinedPlayer.characterStats,
    };
    effectivePlayer.baseStats = getPlayerStats(effectivePlayer);

    const actionPointsUsed = getPlayerActionsCosts(effectivePlayer, actionsState);
    const actionsPerTurn = getPlayerActionsPerTurn(effectivePlayer)
    const actionPointsTotal = actionsPerTurn.total;

    const magicUsed = getPlayerActionsMagic(effectivePlayer, actionsState);
    const magicLeft = effectivePlayer.magic - magicUsed;

    const isAttacking = actionsState?.actions.some(a => a.type === PlayerActionType.Attack) || false;

    const actionPointsLeft = actionPointsTotal - actionPointsUsed
    const playerCanMove = (effectivePlayer.health > 0) && !isAttacking &&  actionPointsLeft >= actionsPerTurn.move;

    const allocatedPoints = addedStats ? Object.values(addedStats)
      .reduce((total, points) => total + points, 0) : 0;
    const availablePoints = Math.max(0, effectivePlayer.availableStats - allocatedPoints);

    const playerStats: PlayerStats = {
      health: effectivePlayer.health,
      magic: effectivePlayer.magic,
      baseStats: effectivePlayer.baseStats,
      actionsPerTurn,
      actionPointsUsed,
      actionPointsTotal,
      availablePoints,
      magicUsed,
      magicLeft,
      isAttacking,
      playerCanMove,
    };

    const activePlayer = {
      ...combinedPlayer,
      baseStats: effectivePlayer.baseStats,
    };

    for(const listener of this.listeners) {
      listener(
        playerStats,
        actionsState || { actions: [] },
        addStatsState || null,
        activePlayer
      );
    }

    return playerStats;
  }

  private async getData<T>(data: T, callback: () => Promise<ApiResponse<T>>) {
    if (data) {
      return data!;
    }
    return await callback().then(this.getResponseData);
  }

  private getResponseData<T>(response: ApiResponse<T>): T | undefined {
    if (response.success) {
      return response.data;
    } else {
      console.error(response.error);
      return undefined;
    }
  }
}

const playerStatsSyncService = new PlayerStatsSyncService();
export default playerStatsSyncService;