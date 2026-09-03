import { AllMonsterState } from "../store/types";

export async function populateMonsters(): Promise<AllMonsterState> {
  const monsterState = {
    monsters: [
      { id: 'rat.1', type: 'rat', location: 50, health: 5 },
      { id: 'rat.2', type: 'rat', location: 50, health: 3 },
      { id: 'rat.3', type: 'rat', location: 32, health: 5 },
      { id: 'spider.1', type: 'spider', location: 51, health: 2 },
      { id: 'spider.2', type: 'spider', location: 51, health: 5 },
      { id: 'spider.3', type: 'spider', location: 52, health: 4 },
      { id: 'spider.4', type: 'spider', location: 52, health: 5 }
    ]
  };

  return monsterState;
}
