import { GameRunnerDefinition } from '../types';
import { warlordsOfFireGameCreation } from './game-creation';
import { getMonsters } from './monsters';
import { warlordsOfFireProcesses } from './processes';
import { PlayerActionFastTravel, PlayerActionMove, PlayerActionRecruit, PlayerActionType } from '@/lib/store/types';
import { actionNpcRecruit, actionNpcTravel } from './npc-actions';

export const warlordsOfFireRunner: GameRunnerDefinition = {
  gameCreation: warlordsOfFireGameCreation,
  getMonsters,
  processes: warlordsOfFireProcesses,
  executeNpcAction: (params, npc, action) => {
    switch (action.type) {
      case PlayerActionType.Move:
      case PlayerActionType.FastTravel:
        actionNpcTravel(params, npc, action as PlayerActionMove | PlayerActionFastTravel);
        break;
      case PlayerActionType.Recruit:
        actionNpcRecruit(params, npc, action as PlayerActionRecruit);
        break;
    }
  },
};
