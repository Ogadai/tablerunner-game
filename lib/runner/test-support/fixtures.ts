import type { BaseParams } from '../base-params';
import type { MonsterState } from '../../store/types';
import { createGame, createLocations } from '../../store/test-support/fixtures';

export { createGame, createNpc, createPlayer } from '../../store/test-support/fixtures';

export function createParams(overrides: Partial<BaseParams> = {}): BaseParams {
  const params: BaseParams = {
    boardId: 'board', mapId: 'map', gameState: createGame(),
    messages: {}, ...createLocations(), ...overrides,
  };
  for (const player of params.gameState.players) {
    params.messages[player.id] ??= { messages: [] };
  }
  return params;
}

export function createMonster(overrides: Partial<MonsterState> = {}): MonsterState {
  return { id: 'rat', type: 'rat', location: 1, health: 5, ...overrides };
}
