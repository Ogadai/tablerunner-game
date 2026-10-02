import { BaseParams } from "../base-params";
import { ProcessRunner } from "../types";
import { allItems, SpecialIds } from "@/lib/games/items";
import { createItemForInventory } from "../apply-inventory";
import { playerMessageAtLocation, broadcastMessage } from "../game-messages";
import { publishPreloadVideo, publishPlayVideo } from '@/lib/messages/message-videos';
import { VideoNames } from "@/lib/messages/video-list";
import { GameState, getDisplayName, PlayerState } from "@/lib/store/types";
import { generateMonster, getCellCoordinates } from "@/lib/games/monster-pack";
import { monsters } from "@/lib/games/monsters";
import { joinWithAnd } from "@/lib/string-helpers";
import { cauldronOfFirePortals } from '@/lib/games/maps/cauldron-of-fire/portals';

const shardLocations: number[][] = [
  [7, 50, 13, 16, 20, 60, 61, 113, 111, 109, 106, 97, 100],
  [1, 2, 36, 37, 44, 116, 87, 76, 146, 152, 230,],
  [3, 35, 120, 73, 136, 101, 212, 213],
  [160, 156, 164, 162, 240, 206, 192, 166, 227, 221, 220, 214],
  [202]
];

const bossOptions: string[][] = [
  ['skeletaldragon', 'skeletaldragon', 'skeletaldragon'],
  ['firespirit', 'firespirit', 'squizard', 'ogre'],
  ['lich', 'skeleton', 'skeleton', 'skeleton', 'skeleton'],
  ['hydra', 'hydra', 'hydra', 'skeletaldragon'],
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

    // Setup the boss battle
    const bosses = bossOptions[Math.floor(Math.random() * bossOptions.length)];
    for(const boss of bosses) {
      params.monsters.push(
        generateMonster(params.gameState, {
          type: boss,
          location: FINISH_LOCATION,
          health: monsters[boss].baseStats.health,
          team: 'monster',
        })
      );
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
          `***${getDisplayName(winner)} has won the game!***`
        )

        state.winner = true;
        await publishPlayVideo(params.boardId, params.mapId, winVideo);
      } else if (finishPlayers.length > 1) {
        // Remaining players must battle it out for the win
        broadcastMessage(params,
          `**${joinWithAnd(finishPlayers.map(p => getDisplayName(p)))}** have all reached the throne with **${SHARDs_REQUIRED} shards**.`
        );
        broadcastMessage(params, '***The winner will be decided by combat!***');

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
