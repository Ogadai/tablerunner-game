import { google } from '@ai-sdk/google';
import { generateText, Output } from 'ai'; // <-- Import Output here
import { z } from 'zod';

import { AllMonsterState } from "../store/types";
import { cauldronOfFire } from '../games/maps';
import { monsters, getPointsForDamage } from '../games/monsters';
import { GRID_CELLS, MAP_COLUMNS, MAP_ROWS } from '../games/gridCells';
import { monsters1 } from './monster-pack';

export async function populateMonsters(mapId: string): Promise<AllMonsterState> {
  return monsters1;
  // const aiMonsters = await askAIForMonsters(mapId);
  // return aiMonsters;
}

async function askAIForMonsters(mapId: string): Promise<AllMonsterState> {
  const cellDescriptions = GRID_CELLS
    .map(c => {
      const cell = cauldronOfFire.find(l => l.id === c);
      return {
        id: cell?.id || 0,
        description: cell?.description|| ''
      };
    });

  const mapRows: { id: number, description: string }[][] = [];
  for (let i = 0; i < MAP_ROWS; i++) {
    const startCell = MAP_COLUMNS * (MAP_ROWS - i - 1);
    mapRows.push(cellDescriptions.slice(startCell, startCell + MAP_COLUMNS));
  }

  const monsterList = Object.keys(monsters).map(id => ({
    id,
    strength: getPointsForDamage(id, 1)
  }));

  const gameInfo = {
    mapRows,
    monsterList
  };

  const googleModel = process.env.GOOGLE_GENERATIVE_AI_MODEL;
  if (!googleModel) {
    console.error('No Google Model defined');
    return { monsters: [] };
  }

  try {
    const result = await generateText({
      model: google(googleModel),
      system: `You are in charge of populating a map for a fantasy RPG game with monsters for the players to fight.
              Analyse the Game Info mapRows for descriptions of each location in the 20 by 12 grid.
              Villages should not have any monsters. Roads should sometimes have monsters but sometimes be empty.
              Trails should usually have monsters, but occasionally be empty.
              Forests and desert and caves and tunnels should usually have monsters.
              The monsters at a location should mostly, but not always, be the same type.
              Forests and Mountains and Desert should be populated with monsters suitable for the environment.
              The castle should mainly be populated with skeletons since the king is a necromancer who can summon them.
              The players start in the middle of the first row at the gate. This location should not have any monsters.
              Areas nearer the starting area should be easier, with 1-3 less strong monsters.
              Areas further from the starting area should be progressivly harder, getting stronger monsters and up to 10 at a location`,
      prompt: `Game Info: ${JSON.stringify(gameInfo)}`,
      
      // Pass the output constraint here instead
      output: Output.object({
        schema: z.object({
          monsters: z.array(z.object({
            id: z.string().describe('A unique id for this monster'),
            type: z.string().describe('The id of the monster type from monsterList'),
            location: z.number().describe('The id of the location from mapRows')
          })),
        })
      })
    });

    return {
      monsters: result.output.monsters.map(m => ({
        ...m,
        health: monsters[m.type].baseStats.health
      }))
    };
  } catch(ex) {
    console.error(ex);
    return { monsters: [] };
  }

}
