import { BaseParams } from "../base-params";
import { ProcessRunner } from "../types";
import { allItems, SpecialIds } from "@/lib/games/items";
import { createItemForInventory } from "../apply-inventory";
import { playerMessageAtLocation, broadcastMessage } from "../game-messages";
import { publishPreloadVideo, publishPlayVideo } from '@/lib/messages/message-videos';
import { VideoNames } from "@/lib/messages/video-list";
import { GameState, getDisplayName, PlayerState } from "@/lib/store/types";

const shardLocations: number[] = [
  1, 3, 38, 44, 35, 7, 50, 13, 16, 67, 20, 60, 61,
  120, 116, 87, 76, 73, 113, 111, 109, 106, 146, 136, 101, 97, 100, 152, 230, 212,
  160, 156, 162, 240, 202, 192, 227, 221, 220, 214
];

const SHARD_COUNT = 10;

const preloadLocations: number[] = [217, 223];

const FINISH_LOCATION = 224;
const SHARDs_REQUIRED = 3;

interface ShardsDef {
  winner?: boolean;
}

const OWNER = 'crystal-chard';

const getState = (gameState: GameState) => 
  ({ ...(gameState.processState[OWNER] || { winner: false }) as ShardsDef });

const saveState = (gameState: GameState, state: ShardsDef) => {
  gameState.processState[OWNER] = state;
}

const shardVideos = [
  VideoNames.fireCrystalShardFound1,
  VideoNames.fireCrystalShardFound2,
  VideoNames.fireCrystalShardFound3
];

const winnerVideos: { [key: string]: VideoNames } = {
  barbarian: VideoNames.barbarianWins,
  witch: VideoNames.witchWins,
  ranger: VideoNames.rangerWins,
  mage: VideoNames.mageWins
};

export const shardProcess: ProcessRunner = {
  async setup(params: BaseParams): Promise<void> {
    // Make portals "visited"
    params.gameState.visited = [
      ...params.gameState.portals
    ];
    params.gameState.visitedPortals = [
      ...params.gameState.portals
    ];

    const shardItem = allItems[SpecialIds.fireCrystalShard];

    // Add the shards
    const availableLocations = [...shardLocations];
    for(let n = 0; n < SHARD_COUNT; n++) {
      const index = Math.floor(Math.random() * availableLocations.length);
      const location = availableLocations.splice(index, 1)[0];

      // Add the shard
      params.items.push({
        ...createItemForInventory(params.gameState, shardItem),
        location
      });
    }
  },

  async executeForTurn(params: BaseParams): Promise<void> {
    // Any found sharts (defeated monsters) should be split between players
    const state = getState(params.gameState);

    const locations = new Set<number>(params.gameState.players.map(p => p.location.id));
    const shardItem = allItems[SpecialIds.fireCrystalShard];

    for(const location of locations.values()) {
      const players = params.gameState.players.filter(p => p.location.id === location);

      if (preloadLocations.includes(location)) {
        const winVideo = winnerVideos[players[0].id] || VideoNames.fireCrystalShardWin;
        await publishPreloadVideo(params.boardId, params.mapId, winVideo);
      }

      const shards = params.items.filter(i => i.location === location && i.type === SpecialIds.fireCrystalShard);
      if (shards.length > 0) {
        const playerShardCount = (player: PlayerState) =>
            player.equipment.filter(i => i.type === SpecialIds.fireCrystalShard).length;

        const mostShardCount = Math.min(2,
          players.reduce((count, player) => Math.max(count, playerShardCount(player)), 0)
        );

        const video = shardVideos[mostShardCount];
        const monstersHere = params.monsters.filter(m => m.location === location && m.health > 0);
        if (monstersHere.length > 0) {
          await publishPreloadVideo(params.boardId, params.mapId, video);
        } else {
          // Each player gets a shard
          for(const player of players) {
            player.equipment.push(createItemForInventory(params.gameState, shardItem));
            const shardCount = playerShardCount(player);

            broadcastMessage(params,
              `**${getDisplayName(player)}** has **${shardCount} Fire Crystal Shard${shardCount == 1 ? '' : 's'}**`
            );
          }

          await publishPlayVideo(params.boardId, params.mapId, video);
          params.items = params.items.filter(i => i.location !== location || i.type !== SpecialIds.fireCrystalShard);
        }
      }
    }

    if (!state.winner) {
      const finishPlayers = params.gameState.players.filter(p => p.location.id === FINISH_LOCATION
        && p.equipment.filter(i => i.type === SpecialIds.fireCrystalShard).length >= SHARDs_REQUIRED
        && p.health > 0
      );

      if (finishPlayers.length === 1) {
        const winner = finishPlayers[0];
        const winVideo = winnerVideos[winner.id] || VideoNames.fireCrystalShardWin;

        playerMessageAtLocation(params, winner.id,
          `**{player}** {ownership} reached the throne with **${SHARDs_REQUIRED} shards**`
        )

        broadcastMessage(params,
          `**${getDisplayName(winner)}** has **won the game!**`
        )

        state.winner = true;
        await publishPlayVideo(params.boardId, params.mapId, winVideo);
      } else if (finishPlayers.length > 1) {
        // Remaining players must battle it out for the win
        broadcastMessage(params,
          `**${finishPlayers.map(p => getDisplayName(p)).join(', ')}** have all reached the throne with **${SHARDs_REQUIRED} shards**. The winner will be decided by combat!`
        );

        for(const player of finishPlayers) {
          // Assign players different teams
          player.team = player.id;
          for(const npc of params.gameState.npcs.filter(n => n.masterId === player.id)) {
            // Their NPCs are on the same team
            npc.team = player.id;
          }
        }
      }
    }

    saveState(params.gameState, state);
  }
}
