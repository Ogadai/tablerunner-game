import { allItems, EquipableIds } from "@/lib/games/items";
import { BaseParams } from "../base-params";
import { broadcastMessage, playerMessageAtLocation } from "../game-messages";
import { ProcessRunner } from "../types";
import { createItemForInventory } from "../apply-inventory";
import { getCellAtCoordinates, getCellCoordinates } from "@/lib/games/monster-pack";
import { MAP_COLUMNS, MAP_ROWS } from '@/lib/games/gridCells';
import { games } from "@/lib/games/games";

const OWNER = 'dragons';
const DRAGON_LED_RGB = 'A00000';
const babyLocations = [136, 101, 120, 73];

const LAVA_MIN_TURNS = 20;
const LAVA_TURN_RANGE = 30;

const LAVA_EXTENT: number[][] = [
  [162, 232, 195],
  [162, 161, 163, 232, 233, 195, 194, 196],
  [162, 161, 163, 200, 198, 159, 232, 233, 208, 195, 194, 196, 167, 207],
  [162, 161, 163, 200, 198, 159, 121, 122, 123, 232, 233, 208, 209, 234, 195, 194, 196, 166,  167, 168, 207, 234],
];

const DRAGON_ROUTES: number[][] = [
  [202, 239, 238, 237, 204, 197, 165, 155, 154, 153, 152, 151, 150, 149, 148, 134, 135, 105, 104, 103, 102],
  [202, 239, 238, 237, 204, 197, 165, 155, 127, 128, 129, 130, 131, 132, 108, 107, 106, 105, 104, 103, 102],
  [202, 239, 238, 237, 204, 197, 165, 155, 127, 113, 89, 71, 70, 69, 68, 67, 66, 65, 97, 98, 102],
  [202, 239, 238, 237, 204, 197, 165, 155, 125, 124, 118],
  [202, 239, 238, 237, 204, 197, 165, 155, 126, 115, 114, 88, 72, 48, 47, 46, 45, 77],
];

const AVAILABLE_ROUTES: { [id: string]: number[][] } = {
  '136': [DRAGON_ROUTES[0], DRAGON_ROUTES[1], DRAGON_ROUTES[2]],
  '101': [DRAGON_ROUTES[0], DRAGON_ROUTES[1], DRAGON_ROUTES[2]],
  '120': [DRAGON_ROUTES[3], DRAGON_ROUTES[4]],
  '73': [DRAGON_ROUTES[3], DRAGON_ROUTES[4]],
};

interface DragonsDef {
  lastLava: number;
  nextLava?: number;
  dragonBabyDead?: boolean;
  dragonFlightTurn?: number;
  dragonRoute?: number[];
  currentLavaTurn?: number;
  currentLavaMax?: number;
}

const getState = (params: BaseParams) => 
  (params.gameState.processState[OWNER] || { lastLava: 0 }) as DragonsDef;

const saveState = (params: BaseParams, invasions: DragonsDef) => {
  params.gameState.processState[OWNER] = invasions;
}

export const dragons: ProcessRunner = {
  async setup(params: BaseParams): Promise<void> {
    const dragonLocation = 202;
    const babyLocation = babyLocations[Math.floor(Math.random() * babyLocations.length)];

    // Create the Fire Dragon and baby
    params.monsters.push(
      {
        id: "fire-dragon",
        type: "dragon",
        location: dragonLocation,
        health: 60,
      },
      {
        id: "fire-dragon-baby",
        type: "dragonbaby",
        location: babyLocation,
        health: 30,
      },
    );

    // Create the loot
    const allLoot: { id: EquipableIds, dragon: boolean }[] = [
      { id: EquipableIds.swordDragon, dragon: false },
      { id: EquipableIds.bowLegendary, dragon: false },
      { id: EquipableIds.staffSun, dragon: false },
      { id: EquipableIds.staffEarth, dragon: false },
    ];

    for(let n = 0; n < 3; n++) {
      const randIndex = Math.floor(Math.random() * allLoot.length);
      allLoot[randIndex].dragon = true;
    }

    for(const dragonLoot of allLoot) {
      // Add the loot
      params.items.push({
        ...createItemForInventory(params.gameState, allItems[dragonLoot.id]),
        location: dragonLoot.dragon ? dragonLocation : babyLocation
      });
    }
  },
  
  async executeForTurn(params) {
    const dragonsState = getState(params);

    let processLava = dragonsState.currentLavaTurn !== undefined;
    if (!processLava) {
      if (!dragonsState.nextLava) {
        dragonsState.nextLava = dragonsState.lastLava + LAVA_MIN_TURNS + Math.floor(Math.random() * LAVA_TURN_RANGE);
      }

      if (params.gameState.turn > dragonsState.nextLava!) {
        dragonsState.currentLavaTurn = 0;
        dragonsState.currentLavaMax = 2 + Math.floor(Math.random() * 2);
        processLava = true;

        broadcastMessage(params, 'The **Volcano** stirs. **The Lava is rising**');
      }
    }

    const babyDragon = params.monsters.find(m => m.type === 'dragonbaby');
    const dragon = params.monsters.find(m => m.type === 'dragon')!;

    let dragonLed: number | undefined = undefined;
    if (!dragonsState.dragonBabyDead) {
      if (babyDragon?.health === 0) {
        dragonsState.dragonBabyDead = true;
        if (dragonsState.currentLavaTurn && dragonsState.currentLavaTurn > dragonsState.currentLavaMax!) {
          dragonsState.currentLavaTurn = 2 * dragonsState.currentLavaMax! - dragonsState.currentLavaTurn;
        } else {
          dragonsState.currentLavaTurn = 0;
        }
        dragonsState.dragonFlightTurn = 0;
        dragonsState.currentLavaMax = 4;
        
        const availableRoutes = AVAILABLE_ROUTES[`${babyDragon.location}`];
        dragonsState.dragonRoute = availableRoutes[Math.floor(Math.random() * availableRoutes.length)];

        broadcastMessage(params, '**A Mighty Roar echoes across the land**');
      }
    } else {
      if (params.gameState.players.filter(p => p.location.id === dragon.location).length === 0) {
        dragonsState.dragonFlightTurn = (dragonsState.dragonFlightTurn || 0) + 1;
        if (dragonsState.dragonFlightTurn < dragonsState.dragonRoute!.length) {
          dragon.location = dragonsState.dragonRoute![dragonsState.dragonFlightTurn];
        } else {
          // Wander aimlessly
          const cellCoords = getCellCoordinates(dragon.location);
          const offset = {
            col: cellCoords.col / MAP_COLUMNS,
            row: cellCoords.row / MAP_ROWS,
          };

          const randChange = (offset: number): number =>
            (Math.random() < offset / 2)
          ? -1
          : ((Math.random() > offset * 2) ? 1 : 0);

          cellCoords.col += randChange(offset.col);
          cellCoords.row += randChange(offset.row);

          if (cellCoords.col >= 0 && cellCoords.col < MAP_COLUMNS
              && cellCoords.row >= 0 && cellCoords.row < MAP_ROWS
          ) {
            const newLocation = getCellAtCoordinates(cellCoords);
            const gameDef = games.find(g => g.id === params.gameState.gameId)!;
            if (newLocation !== dragon.location && !gameDef.locations[newLocation - 1].underground) {
              dragon.location = newLocation;
            }
          }
        }

        if (dragonsState.dragonFlightTurn === 1) {
          broadcastMessage(params, '**The Fire Dragon emerges from her nest**'); 
        } else if (dragonsState.dragonFlightTurn === 2) {
          broadcastMessage(params, 'The Fire Dragon is **enraged**. Someone **killed her baby**, you monsters!'); 
        }
      }
      dragonLed = dragon.location;
    }

    let lavaLocations: number[] = [];

    if (processLava) {
      dragonsState.currentLavaTurn!++;

      let lavaLevel = (dragonsState.currentLavaTurn! > dragonsState.currentLavaMax!)
        ? 2 * dragonsState.currentLavaMax! - dragonsState.currentLavaTurn!
        : dragonsState.currentLavaTurn!;

      if (lavaLevel > 0) {
        lavaLocations.push(...LAVA_EXTENT[lavaLevel - 1]);
      }

      // Kill all the monsters here
      for(const monster of params.monsters) {
        if (lavaLocations.includes(monster.location)) {
          monster.health = 0;
        }
      }

      // Kill any NPCs here
      for(const npc of params.gameState.npcs) {
        if (lavaLocations.includes(npc.location.id)) {
          npc.health = 0;
        }
      }

      // Kill any players here
      for(const player of params.gameState.players) {
        if (lavaLocations.includes(player.location.id)) {
          player.health = 0;
          playerMessageAtLocation(params, player.id, `**{player} fell into the lava**`);
        }
      }

      // Destroy any shops here
      if (!params.gameState.locationOverrides) {
        params.gameState.locationOverrides = [];
      }
      for(const store of params.gameState.stores.filter(s => lavaLocations.includes(s))) {
        params.gameState.locationOverrides.push({
          id: store,
          description: 'This building has been destroyed by Lava',
        });
      }

      params.gameState.stores = params.gameState.stores.filter(s => !lavaLocations.includes(s));

      if (lavaLevel <= 0) {
        // Ended this eruption
        dragonsState.lastLava = params.gameState.turn;
        delete dragonsState.currentLavaTurn;
        delete dragonsState.currentLavaMax;
        delete dragonsState.nextLava;
      }
    }
  
    if (dragonLed) {
      lavaLocations.push(dragonLed);
    }

    params.gameState.leds = [
      ...params.gameState.leds.filter(l => l.owner !== OWNER),
      ...lavaLocations.map(l => ({
        location: l,
        rgb: DRAGON_LED_RGB,
        owner: OWNER,
      }))
    ];

    saveState(params, dragonsState);
  },
}
