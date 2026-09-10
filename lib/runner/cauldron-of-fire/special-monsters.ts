import { BaseParams } from "../base-params";
import { broadcastMessage } from "../game-messages";
import { ProcessRunner } from "../types";

export const keyProcess: ProcessRunner = {
  async setup(params: BaseParams): Promise<void> {
    // Create the Lich king
    params.monsters.push({
      id: "lich-king",
      type: "lich",
      location: 224,
      health: 30,
    });

    // Move protection for the Lich King back entrances
    params.monsters.push(
      {
        id: "lich-guard-1",
        type: "minotaur",
        location: 228,
        health: 30,
      },
      {
        id: "lich-guard-2",
        type: "ogre",
        location: 181,
        health: 22,
      },
      {
        id: "lich-guard-3",
        type: "ogre",
        location: 181,
        health: 22,
      },
    );

    // Create the Fire Dragon
    params.monsters.push({
      id: "fire-dragon",
      type: "dragon",
      location: 202,
      health: 60,
    },);
  },

  async executeForTurn(params) {
    const lich = params.monsters.find(m => m.id === 'lich-king');
    if (lich?.health === 0) {
      broadcastMessage(params, 'You have defeated the Evil Lich King! Game Over!');
    }
  },
}
