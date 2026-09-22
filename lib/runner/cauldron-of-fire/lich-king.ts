import { GameState, NPCState } from "@/lib/store/types";
import { BaseParams } from "../base-params";
import { broadcastMessage } from "../game-messages";
import { ProcessRunner } from "../types";
import { LocationMoveDirection } from "@/lib/games/types";
import { publishPreloadVideo, publishPlayVideo } from '@/lib/messages/message-videos';
import { VideoNames } from "@/lib/messages/video-list";
import { monsters } from "@/lib/games/monsters";
import { allItems, EquipableIds } from "@/lib/games/items";
import { createItemForInventory } from "../apply-inventory";
import { SpellIds, spells } from "@/lib/games/spells";
import { games } from "@/lib/games/games";
import { getLocationsStateFromRedis } from "@/lib/store/redis-access";

const OWNER = 'lich-king';
const LICH_KING_ID = 'lich-king';
const CASTLE_LOCATIONS = [221, 222, 223, 224, 225, 226, 227, 214, 215, 216, 217, 218, 219, 220];
const PRELOAD_LOCATIONS = [228, 184, 181];
const LICH_LOCATION = 224;

interface LichKingDef {
  initiated: boolean;
  gameOver?: boolean;
  lastDirection?: LocationMoveDirection;
}

const getState = (gameState: GameState) => 
  ({ ...(gameState.processState[OWNER] || { initiated: false }) as LichKingDef });

const saveState = (gameState: GameState, state: LichKingDef) => {
  gameState.processState[OWNER] = state;
}

const playersPresent = (gameState: GameState): boolean => gameState.players.some(p =>
    CASTLE_LOCATIONS.includes(p.location.id)
  );

const checkInitiate = (params: BaseParams, state: LichKingDef): boolean => {
  if (!state.initiated && playersPresent(params.gameState)) {
    // Turn a monster corpse into a zombie NPC
    const monsterDef = monsters['lich'];

    const staff = createItemForInventory(params.gameState, allItems[EquipableIds.staffEarth]);
    const armour = createItemForInventory(params.gameState, allItems[EquipableIds.armourShadow]);
    const helmet = createItemForInventory(params.gameState, allItems[EquipableIds.helmetHorned]);

    const newNPC: NPCState = {
      id: LICH_KING_ID,
      masterId: null,
      name: monsterDef.name,
      location: { id: LICH_LOCATION, description: '', move: [] },
      magic: monsterDef.baseStats.magic,
      spells: [
        SpellIds.iceShards,
        SpellIds.iceStorm,
        SpellIds.terror,
        SpellIds.lightning,
        SpellIds.raiseDead,
        SpellIds.animateCorpse,
      ],
      equipment: [staff, armour, helmet],
      equipped: { weapon: staff.id, armour: armour.id, helmet: helmet.id },
      baseStats: {  ...monsterDef.baseStats },
      hireCost: 0,
      iconXY: monsterDef.iconXY,
      health: monsterDef.baseStats.health,
      alignment: 'evil',
    };

    // remove the monster and add the npc
    params.monsters = params.monsters.filter(m => m.id !== LICH_KING_ID);
    params.gameState.npcs.push(newNPC);
        
    publishPlayVideo(params.boardId, params.mapId, VideoNames.lichKingStands);
    return true;
  }
  return false;
}

const checkPreload = (params: BaseParams, state: LichKingDef) => {
  if (!state.initiated && params.gameState.players.some(p =>
    PRELOAD_LOCATIONS.includes(p.location.id)
  )) {
    publishPreloadVideo(params.boardId, params.mapId, VideoNames.lichKingStands);
  }
}

const checkEndGame = (params: BaseParams, state: LichKingDef): boolean => {
  if (state.initiated && !state.gameOver) {
    const lich = params.npcs.find(n => n.id === LICH_KING_ID);

    if (lich?.health === 0) {
      broadcastMessage(params, 'You have defeated the Evil Lich King! Game Over!');
      publishPlayVideo(params.boardId, params.mapId, VideoNames.lichKingDead);
    }
  }

  return state.gameOver || false;
}

export const lichKing: ProcessRunner = {
  async setup(params: BaseParams): Promise<void> {
    // Create the Lich king
    params.monsters.push({
      id: LICH_KING_ID,
      type: "lich",
      location: LICH_LOCATION,
      health: 30,
    });

    // Move protection for the Lich King back entrances
    const minotaurLocations = [212, 213, 228];
    params.monsters.push(
      {
        id: "lich-guard-1",
        type: "minotaur",
        location: minotaurLocations[Math.floor(Math.random() * minotaurLocations.length)],
        health: 30,
      },
      {
        id: "lich-guard-2",
        type: "minotaur",
        location: minotaurLocations[Math.floor(Math.random() * minotaurLocations.length)],
        health: 30,
      },
      {
        id: "lich-guard-3",
        type: "ogre",
        location: 181,
        health: 22,
      },
      {
        id: "lich-guard-4",
        type: "ogre",
        location: 181,
        health: 22,
      },
      {
        id: "lich-guard-5",
        type: "skeleton",
        location: 224,
        health: 16,
      },
      {
        id: "lich-guard-6",
        type: "skeleton",
        location: 224,
        health: 16,
      },
    );
  },

  async initialiseForTurn(params: BaseParams) {
    const state = getState(params.gameState);
    if (state.initiated) {
      // Capture messages for the lich king
      params.messages[LICH_KING_ID] = { messages: []};
    }
  },

  async executeForTurn(params) {
    const state = getState(params.gameState);

    checkPreload(params, state);
    if (checkInitiate(params, state)) {
      state.initiated = true;
    } else if (checkEndGame(params, state)) {
      state.gameOver = true;
    } else {

    }

    saveState(params.gameState, state);
  },

  async executeBetweenTurns(params: BaseParams) {
    const state = getState(params.gameState);
    if (state.initiated && !state.gameOver && playersPresent(params.gameState)) {
      const gameDef = games.find(g => g.id === params.gameState.gameId)!;
      const locationsState = await getLocationsStateFromRedis(params.boardId, params.mapId);

      const lich = params.gameState.npcs.find(n => n.id === LICH_KING_ID)!;

      // Gather the information for the AI
      const locations = gameDef.locations
        .filter(l => CASTLE_LOCATIONS.includes(l.id))
        .map(l => ({
          ...l,
          monsters: locationsState.monsters.filter(m => m.location === l.id),
          heros: [
            ...params.gameState.players.filter(p => p.location.id === l.id),
            ...params.gameState.npcs.filter(n => n.location.id === l.id),
          ]
        }));

      const spellDetails = lich.spells.map(s => spells[s]);

      
    }
  }
}
