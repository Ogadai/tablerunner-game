import { allItems, EquipableIds } from "@/lib/games/items";
import { BaseParams } from "../base-params";
import { broadcastMessage } from "../game-messages";
import { ProcessRunner } from "../types";
import { createItemForInventory } from "../apply-inventory";

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

interface DragonsDef {
  lastLava: number;
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

    let processLava = dragonsState.currentLavaTurn && dragonsState.currentLavaTurn > 0;
    if (!processLava && (params.gameState.turn > 
      (dragonsState.lastLava + LAVA_MIN_TURNS + Math.floor(Math.random() * LAVA_TURN_RANGE)))) {
      dragonsState.currentLavaTurn = 0;
      processLava = true;
    }

    if (processLava) {
      dragonsState.currentLavaTurn!++;

      let lavaLevel = (dragonsState.currentLavaTurn! > dragonsState.currentLavaMax!)
        ? dragonsState.currentLavaMax! - dragonsState.currentLavaTurn!
        : dragonsState.currentLavaTurn!;

      const lavaLocations = LAVA_EXTENT[lavaLevel];
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
          broadcastMessage(params, `**{player} fell into the lava**`);
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

      params.gameState.leds = [
        ...params.gameState.leds.filter(l => l.owner !== OWNER),
        ...lavaLocations.map(l => ({
          location: l,
          rgb: DRAGON_LED_RGB,
          owner: OWNER,
        }))
      ];

      if (lavaLevel <= 0) {
        // Ended this eruption
        dragonsState.lastLava = params.gameState.turn;
      }
    }


    saveState(params, dragonsState);
  },
}
