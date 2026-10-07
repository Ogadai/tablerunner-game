import { BaseParams } from "../base-params";
import { ProcessRunner } from "../types";
import { allItems, SpecialIds } from "@/lib/games/items";
import { createItemForInventory } from "../apply-inventory";
import { broadcastMessage } from "../game-messages";
import { publishPreloadVideo, publishPlayVideo } from '@/lib/messages/message-videos';
import { VideoNames } from "@/lib/messages/video-list";
import { getDisplayName, PlayerState } from "@/lib/store/types";
import { getCellCoordinates } from "@/lib/games/gridCells";
import { cauldronOfFirePortals } from '@/lib/games/maps/cauldron-of-fire/portals';
import { getState } from './race-state';

const shardLocations: number[][] = [
  [7, 50, 13, 16, 20, 60, 61, 113, 111, 109, 106, 97, 100],
  [1, 2, 36, 37, 44, 116, 87, 76, 146, 152, 230,],
  [3, 35, 120, 73, 136, 101, 212, 213],
  [160, 156, 164, 162, 240, 206, 192, 166, 227, 221, 220, 214],
  [202]
];

const SHARD_COUNT = 10;

const shardVideos = [
  VideoNames.fireCrystalShardFound1,
  VideoNames.fireCrystalShardFound2,
  VideoNames.fireCrystalShardFound3
];

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
    const availableLocations = shardLocations.map(
      (locs, index) => locs.map(l => ({ location: l, weight: index + 2 }))
    ).flat();

    const excludeSet = new Set<number>([
      ...shardLocations.flat(),
      ...cauldronOfFirePortals
    ]);
    
    for(let n = 1; n <= 240; n++) {
      if (!excludeSet.has(n)) {
        availableLocations.push({ location: n, weight: 0.2 });
      }
    }

    for(let n = 0; n < SHARD_COUNT; n++) {
      const total = availableLocations.reduce((sum, loc) => sum + loc.weight, 0);
      const randomValue = Math.floor(Math.random() * total);

      let sumWeight = 0;
      let location: number | undefined;
      for (let index = 0; index < availableLocations.length; index++) {
        const loc = availableLocations[index];
        sumWeight += loc.weight;
        if (randomValue < sumWeight) {
          location = loc.location;
          availableLocations.splice(index, 1);
          break;
        }
      }

      const coords = getCellCoordinates(location!);
      for(const loc of availableLocations) {
        const locCoords = getCellCoordinates(loc.location);
        const distance = Math.sqrt(Math.pow(coords.row - locCoords.row, 2) + Math.pow(coords.col - locCoords.col, 2));
        if (distance < 2) {
          loc.weight = 0;
        } else if (distance < 4.8) {
          loc.weight = loc.weight / 2;
        }
      }

      // Add the shard
      params.items.push({
        ...createItemForInventory(params.gameState, shardItem),
        location: location!
      });
    }
  },

  async executeForTurn(params: BaseParams): Promise<void> {
    const state = getState(params.gameState);
    // Any found sharts (defeated monsters) should be split between players
    const locations = new Set<number>(params.gameState.players.map(p => p.location.id));
    const shardItem = allItems[SpecialIds.fireCrystalShard];

    for(const location of locations.values()) {
      const players = params.gameState.players.filter(p => p.location.id === location);

      const shards = params.items.filter(i => i.location === location && i.type === SpecialIds.fireCrystalShard);
      if (shards.length > 0) {
        const playerShardCount = (player: PlayerState) =>
            player.equipment.filter(i => i.type === SpecialIds.fireCrystalShard).length;

        const collectedShardCount = (player: PlayerState) => {
          const team = state.blueTeam?.includes(player.id) ? state.blueTeam
            : state.redTeam?.includes(player.id) ? state.redTeam : undefined;
          if (!team) {
            return playerShardCount(player) + 1;
          }

          // Include every teammate's inventory and the shards about to be collected here.
          return params.gameState.players
            .filter(teammate => team.includes(teammate.id))
            .reduce((total, teammate) => total + playerShardCount(teammate), 0)
            + 1;
        };

        const mostShardCount = Math.min(shardVideos.length - 1,
          players.reduce((count, player) => Math.max(count, collectedShardCount(player)), 0) - 1
        );

        const video = shardVideos[mostShardCount];
        const monstersHere = params.monsters.filter(m => m.location === location && m.health > 0);
        if (monstersHere.length > 0) {
          await publishPreloadVideo(params.boardId, params.mapId, video);
        } else {
          const independentPlayers = players.filter(player =>
            !state.blueTeam?.includes(player.id) && !state.redTeam?.includes(player.id)
          );
          const teamPlayers = [state.blueTeam, state.redTeam]
            .filter((team): team is string[] => team !== undefined)
            .map(team => players.filter(player => team.includes(player.id)))
            .filter(team => team.length > 0);
          const shardRecipients = [
            ...independentPlayers,
            ...teamPlayers.map(team => {
              const fewestShards = Math.min(...team.map(playerShardCount));
              const candidates = team.filter(player => playerShardCount(player) === fewestShards);
              return candidates[Math.floor(Math.random() * candidates.length)];
            })
          ];

          for(const player of shardRecipients) {
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
  }
}
