import {
  PlayerActionMove,
  PlayerState,
  PlayerActionAttack,
  PlayerActionType,
  PlayerAction,
  PlayerActionsState,
  PlayerActionUseItem,
  PlayerActionCast,
  PlayerActionReadScroll,
  PlayerActionPortal,
  INamedTarget,
} from "../store/types";
import {
  getActionsStateFromRedis,
} from '../store/redis-access';
import { EquipableItemDef, PlayerItem } from '@/lib/games/types';
import { monsters } from "../games/monsters";
import { BaseParams } from './base-params';
import { getPlayerActionsPerTurn, getPlayerActionsCosts } from '../store/playerStats';
import { allItems } from "../games/items";
import { getMonsterStats } from './monster-stats';
import { actionAttack, monsterAttack } from './game-action-attack';
import { actionCastSpell, actionReadScroll } from './game-action-spell';
import { actionMove } from "./game-action-move";
import { actionPortal } from "./game-action-portal";
import { actionUseItem } from './game-action-use';

enum EntityActionEntityTypes {
  player,
  npc,
  monster
}

interface EntityActions {
  entityType: EntityActionEntityTypes;
  entityId: string;
  entitySpeed: number;
  actions: PlayerAction[];
  random: number;
}

interface EntityActionsForLocation {
  entities: EntityActions[];
}

const MAGIC_BONUS_RATIO = 0.1;

export async function runGameActions(params: BaseParams): Promise<void> {
  const entityActionsForLocations: Record<string, EntityActionsForLocation> = {};
  const playerMoves: Record<string, PlayerActionMove[]> = {};
  const playerPortals: Record<string, PlayerActionPortal[]> = {};
  const playerFought: Record<string, boolean> = {};

  try {
    // First gather all the player actions per location
    for(const player of params.gameState.players) {
      const locId = `${player.location.id}`;
      if (!entityActionsForLocations[locId]) {
        entityActionsForLocations[locId] = {
          entities: []
        };
      }

      const playerActionState = await getActionsStateFromRedis(params.boardId, params.mapId, player.id);

      // Check there aren't too many actions
      limitPlayerActionsToCost(player, playerActionState);

      // Filter out the moves and portals
      playerMoves[player.id] = playerActionState.actions
        .filter(a => a.type === PlayerActionType.Move)
        .map(a => a as PlayerActionMove);

      playerPortals[player.id] = playerActionState.actions
        .filter(a => a.type === PlayerActionType.Portal)
        .map(a => a as PlayerActionPortal);

      const playerOtheractions = playerActionState.actions
        .filter(a => a.type !== PlayerActionType.Move && a.type !== PlayerActionType.Portal);

      entityActionsForLocations[locId].entities.push({
        entityType: EntityActionEntityTypes.player,
        entityId: player.id,
        entitySpeed: player.baseStats!.speed * Math.random(),
        actions: playerOtheractions,
        random: Math.random(),
      });
    }

    // Now get the monsters at those locations and assign them actions
    for(const locId of Object.keys(entityActionsForLocations)) {
      const locationId = parseInt(locId);
      const monstersAtLocation = params.monsters.filter(m => m.location === locationId && m.health > 0);

      if (monstersAtLocation.length > 0) {
        const targetsAtLocation = entityActionsForLocations[locId].entities
            .filter(e => e.entityType !== EntityActionEntityTypes.monster)
            .map(e => getNamedTargetById(params, e.entityId));

        // Mark each player as having fought
        for(const player of targetsAtLocation) {
          playerFought[player.id] = true;
        }

        for(const monster of monstersAtLocation) {
          const target = monsterPickTarget(targetsAtLocation);
          const monsterAction: PlayerActionAttack = {
            id: 1,
            type: PlayerActionType.Attack,
            description: `${monsters[monster.type].name} attacks ${target.name}!`,
            target: target.id,
          };

          entityActionsForLocations[locId].entities.push({
            entityType: EntityActionEntityTypes.monster,
            entityId: monster.id,
            entitySpeed: getMonsterStats(monster).speed * Math.random(),
            actions: [monsterAction],
            random: Math.random(),
          });
        }
      }

      // Sort the entities within each location by speed
      entityActionsForLocations[locId].entities.sort((e1, e2) => {
        if (e1.entitySpeed === e2.entitySpeed) {
          return e1.random - e2.random;
        }
        return e1.entitySpeed - e2.entitySpeed;
      });

      // Process the entities within each location
      let moreActions = true;
      while(moreActions) {
        moreActions = false;

        for(const entityActions of entityActionsForLocations[locId].entities) {
          if (entityActions.actions.length > 0) {
            await processNextAction(params, entityActions, locationId);
            moreActions = true;
          }
        }
      }
    }

    // Process player moves and healing (if still alive)
    for(const player of params.gameState.players) {
      if (player.health > 0) {

        if (!player.zombie && !playerFought[player.id] && player.health < player.baseStats!.health) {
          player.health++;
        }
        if (player.magic < player.baseStats!.magic) {
          player.magic = Math.min(player.baseStats!.magic,
            player.magic + Math.ceil(player.baseStats!.magic * MAGIC_BONUS_RATIO)
          );
        }

        for(const moveAction of playerMoves[player.id]) {
          actionMove(params, player, moveAction);
        }

        for(const portalAction of playerPortals[player.id]) {
          actionPortal(params, player, portalAction);
        }
      }
    }
  } catch(error) {
    console.error('Error: runGameActions');
    throw error;
  }
}

function limitPlayerActionsToCost(playerState: PlayerState, actionsState: PlayerActionsState) {
  const actionsPerTurn = getPlayerActionsPerTurn(playerState);
  while (getPlayerActionsCosts(playerState, actionsState) > actionsPerTurn.total) {
    // Remove the last action
    actionsState.actions.splice(actionsState.actions.length - 1, 1);
  }
}

async function processNextAction(params: BaseParams, entityActions: EntityActions, locationId: number): Promise<void> {
  try {
    const getPlayerById = (id: string) => params.gameState.players.find(p => p.id === id)!;
    const getMonsterById = (id: string) => params.monsters.find(m => m.id === id)!;

    const nextAction = entityActions.actions.splice(0, 1)[0];

    if (entityActions.entityType === EntityActionEntityTypes.player) {
      const player = getPlayerById(entityActions.entityId);
      if (player && player.health > 0) {
        switch(nextAction.type) {
          case PlayerActionType.Attack:
            actionAttack(params, player, nextAction as PlayerActionAttack);
            break;
          case PlayerActionType.UseItem:
            actionUseItem(params, player, nextAction as PlayerActionUseItem);
            break;
          case PlayerActionType.Cast:
            actionCastSpell(params, player, nextAction as PlayerActionCast);
            break;
          case PlayerActionType.ReadScroll:
            actionReadScroll(params, player, nextAction as PlayerActionReadScroll);
            break;
        }
      }
    } else if (entityActions.entityType === EntityActionEntityTypes.monster) {
      const monster = getMonsterById(entityActions.entityId);
      if (monster && monster.health > 0) {
        switch(nextAction.type) {
          case PlayerActionType.Attack:
          {
            const attackAction = nextAction as PlayerActionAttack
            const target = getNamedTargetById(params, attackAction.target);
            if (target.health > 0) {
              monsterAttack(params, monster, target, locationId);
            }
            break;
          }
        }
      }
    }
  } catch(error) {
    console.error('Error: processNextAction', entityActions);
    throw error;
  }
}

function monsterPickTarget(targets: INamedTarget[]): INamedTarget {
  const targetWeights = targets.map(target => {
    const weaponId = target.equipped.weapon;
    const weapon = weaponId ? target.equipment.find(item => item.id === weaponId) as PlayerItem | undefined : undefined;
    const weaponType = weapon && allItems[weapon.type] as EquipableItemDef;

    const hasRangedOrStaffWeapon = !!weaponType?.ranged || !!weaponType?.staff;

    return hasRangedOrStaffWeapon ? 0.5 : 1;
  });
  const totalWeight = targetWeights.reduce((total, weight) => total + weight, 0);
  let selection = Math.random() * totalWeight;

  for (let index = 0; index < targets.length; index++) {
    selection -= targetWeights[index];
    if (selection < 0) {
      return targets[index];
    }
  }

  return targets[targets.length - 1];
}

const getNamedTargetById = (params: BaseParams, id: string): INamedTarget =>
  // TODO: Also include NPCs
  params.gameState.players.find(p => p.id === id)!;
