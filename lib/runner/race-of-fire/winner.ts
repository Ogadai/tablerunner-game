import { BaseParams } from "../base-params";
import { ProcessRunner } from "../types";
import { SpecialIds } from "@/lib/games/items";
import { generateMonster } from "@/lib/games/monster-pack";
import { monsters } from "@/lib/games/monsters";
import { playerMessageAtLocation, broadcastMessage } from "../game-messages";
import { publishPreloadVideo, publishPlayVideo } from '@/lib/messages/message-videos';
import { VideoNames } from "@/lib/messages/video-list";
import { GameState, getDisplayName, PlayerState } from "@/lib/store/types";
import { joinWithAnd } from "@/lib/string-helpers";

const bossOptions: string[][] = [
  ['skeletaldragon', 'skeletaldragon', 'skeletaldragon'],
  ['firespirit', 'firespirit', 'squizard', 'ogre'],
  ['lich', 'skeleton', 'skeleton', 'skeleton', 'skeleton'],
  ['hydra', 'hydra', 'hydra', 'skeletaldragon'],
];

const preloadLocations: number[] = [217, 223];
const FINISH_LOCATION = 224;
const SHARDS_REQUIRED = 3;

interface WinnerDef {
  winner?: boolean;
  blueTeam?: string[];
  redTeam?: string[];
}

// Keep the existing state key so games already in progress retain their winner.
const OWNER = 'crystal-shard';

const getState = (gameState: GameState) =>
  ({ ...(gameState.processState[OWNER] || { winner: false }) as WinnerDef });

const saveState = (gameState: GameState, state: WinnerDef) => {
  gameState.processState[OWNER] = state;
}

const winnerVideos: { [key: string]: VideoNames } = {
  barbarian: VideoNames.barbarianWins,
  witch: VideoNames.witchWins,
  ranger: VideoNames.rangerWins,
  mage: VideoNames.mageWins
};

export const winnerProcess: ProcessRunner = {
  async setup(params: BaseParams): Promise<void> {
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

  async initialiseForTurn(params: BaseParams): Promise<void> {

  },

  async executeForTurn(params: BaseParams): Promise<void> {
    const state = getState(params.gameState);
    const getChosenTeam = (playerId: string): string | undefined => {
      if (state.blueTeam?.includes(playerId)) {
        return 'blue';
      }
      if (state.redTeam?.includes(playerId)) {
        return 'red';
      }
      return undefined;
    };
    const locations = new Set<number>(params.gameState.players.map(p => p.location.id));

    for(const location of locations.values()) {
      if (preloadLocations.includes(location)) {
        const player = params.gameState.players.find(p => p.location.id === location)!;
        const winVideo = winnerVideos[player.id] || VideoNames.fireCrystalShardWin;
        await publishPreloadVideo(params.boardId, params.mapId, winVideo);
      }
    }

    const bossesAlive = params.monsters.some(m => m.location === FINISH_LOCATION && m.health > 0);
    if (!state.winner && !bossesAlive) {
      const thronePlayers = params.gameState.players.filter(p => p.location.id === FINISH_LOCATION
        && p.health > 0
      );
      const shardCount = (player: PlayerState) =>
        player.equipment.filter(i => i.type === SpecialIds.fireCrystalShard).length;
      const finishPlayers = thronePlayers.filter(player => {
        const team = getChosenTeam(player.id);
        const shards = team === undefined ? shardCount(player) : thronePlayers
          .filter(teammate => getChosenTeam(teammate.id) === team)
          .reduce((total, teammate) => total + shardCount(teammate), 0);
        return shards >= SHARDS_REQUIRED;
      });

      const chosenTeam = finishPlayers.length > 0 ? getChosenTeam(finishPlayers[0].id) : undefined;
      const sharedTeam = chosenTeam !== undefined
        && finishPlayers.every(player => getChosenTeam(player.id) === chosenTeam);

      if (finishPlayers.length === 1 || sharedTeam) {
        const winVideo = finishPlayers.length === 1
          ? winnerVideos[finishPlayers[0].id] || VideoNames.fireCrystalShardWin
          : VideoNames.fireCrystalShardWin;

        for(const winner of finishPlayers) {
          const team = getChosenTeam(winner.id);
          playerMessageAtLocation(params, winner.id,
            team === undefined
              ? `**{player}** {ownership} reached the throne with **${SHARDS_REQUIRED} shards**`
              : `**{player}** reached the throne with the **${team} team**, sharing at least **${SHARDS_REQUIRED} shards**`
          )
        }

        broadcastMessage(params,
          `***${joinWithAnd(finishPlayers.map(p => getDisplayName(p)))} ${finishPlayers.length === 1 ? 'has' : 'have'} won the game!***`
        )

        state.winner = true;
        await publishPlayVideo(params.boardId, params.mapId, winVideo);
      } else if (finishPlayers.length > 1) {
        // Remaining players must battle it out for the win
        broadcastMessage(params,
          `**${joinWithAnd(finishPlayers.map(p => getDisplayName(p)))}** have all reached the throne with at least **${SHARDS_REQUIRED} shards** per team or unaffiliated player.`
        );
        broadcastMessage(params, '***The winner will be decided by combat!***');

        for(const player of finishPlayers) {
          // Activate chosen teams for combat; unaffiliated players fight individually.
          player.team = getChosenTeam(player.id) || player.id;
          for(const npc of params.gameState.npcs.filter(n => n.masterId === player.id)) {
            // Their NPCs are on the same team
            npc.team = player.team;
          }
        }
      }
    }

    saveState(params.gameState, state);
  }
}
