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
  PlayerActionFastTravel,
  NPCState,
  MonsterState,
} from "../store/types";
import {
  getActionsStateFromRedis,
  getMonsterActionsStateFromRedis,
} from '../store/redis-access';
import { EquipableItemDef, PlayerItem } from '@/lib/games/types';
import { BaseParams } from './base-params';
import { getPlayerActionsPerTurn, getPlayerActionsCosts } from '../store/playerStats';
import { allItems } from "../games/items";
import { getMonsterStats } from './monster-stats';
import { actionAttack, monsterAttack } from './game-action-attack';
import { actionCastSpell, actionReadScroll } from './game-action-spell';
import { actionMove, actionRespawn } from "./game-action-move";
import { actionFastTravel, actionPortal } from "./game-action-portal";
import { actionUseItem } from './game-action-use';
import { getCombatActions, getNpcActions } from "./game-npc-actions";

import { getMonsterCombatant } from './monster-combatant';
import { games } from '../games/games';
import { playerMessageAtLocation } from './game-messages';

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

const MAGIC_BONUS_RATIO = 0.2;
const HEAL_SCALING = 0.1;

export async function runGameActions(params: BaseParams): Promise<void> {
  const entityActionsForLocations: Record<string, EntityActionsForLocation> = {};
  const monsterMoves: { monster: MonsterState; action: PlayerActionMove }[] = [];
  const playerMoves: Record<string, PlayerActionMove[]> = {};
  const playerPortals: Record<string, PlayerActionPortal[]> = {};
  const playerFought: Record<string, boolean> = {};
  const playerFastTravels: Record<string, PlayerActionFastTravel[]> = {};
  const playerRespawns: Record<string, PlayerAction[]> = {};

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

      playerFastTravels[player.id] = playerActionState.actions
        .filter(a => a.type === PlayerActionType.FastTravel)
        .map(a => a as PlayerActionFastTravel);

      playerRespawns[player.id] = playerActionState.actions
        .filter(a => a.type === PlayerActionType.Respawn);

      const playerOtheractions = playerActionState.actions
        .filter(a =>
          a.type !== PlayerActionType.Move &&
          a.type !== PlayerActionType.Portal &&
          a.type !== PlayerActionType.FastTravel &&
          a.type !== PlayerActionType.Respawn
        );

      entityActionsForLocations[locId].entities.push({
        entityType: EntityActionEntityTypes.player,
        entityId: player.id,
        entitySpeed: player.baseStats!.speed * Math.random(),
        actions: playerOtheractions,
        random: Math.random(),
      });
    }

    for (const monster of params.monsters.filter(m => m.scriptedActions && m.health > 0)) {
      entityActionsForLocations[monster.location] ??= { entities: [] };
    }

    // Get the NPCs at these locations
    for(const npc of params.gameState.npcs) {
      const locId = `${npc.location.id}`;
      if (entityActionsForLocations[locId]) {
        // automatically figure out NPC's actions (if master isn't moving)
        const masterIsMoving = !!npc.masterId && !!params.gameState.players.find(p => p.id === npc.masterId
              && (playerMoves[p.id].length > 0 || playerPortals[p.id].length > 0
                || playerFastTravels[p.id].length > 0 || playerRespawns[p.id].length > 0));

        const npcActions = await retrieveActionsForNpc(params, npc, masterIsMoving);

        entityActionsForLocations[locId].entities.push({
          entityType: EntityActionEntityTypes.npc,
          entityId: npc.id,
          entitySpeed: npc.baseStats!.speed * Math.random(),
          actions: npcActions.actions,
          random: Math.random(),
        });
      }
    }

    // Now get the monsters at those locations and assign them actions
    for(const locId of Object.keys(entityActionsForLocations)) {
      const locationId = parseInt(locId);
      const monstersAtLocation = params.monsters.filter(m => m.location === locationId && m.health > 0);

      if (monstersAtLocation.length > 0) {
        const targetsAtLocation = entityActionsForLocations[locId].entities
            .filter(e => e.entityType !== EntityActionEntityTypes.monster)
            .map(e => getNamedTargetById(params, e.entityId))
            .filter(target => target && target.health > 0);

        // Mark each player as having fought
        for(const player of targetsAtLocation) {
          playerFought[player.id] = true;
        }

        for (const monster of monstersAtLocation) {
          const combatant = getMonsterCombatant(monster);
          let actions: PlayerAction[];
          if (monster.scriptedActions) {
            const queued = await getMonsterActionsStateFromRedis(params.boardId, params.mapId, monster.id);
            actions = queued?.actions ?? getCombatActions(params, combatant).actions;
          } else if (combatant.spells.length > 0) {
            actions = getCombatActions(params, combatant).actions;
          } else if (targetsAtLocation.length > 0) {
            const target = monsterPickTarget(targetsAtLocation, entityActionsForLocations[locId]);
            actions = [{ id: 1, type: PlayerActionType.Attack,
              description: `${combatant.name} attacks ${target.name}!`, target: target.id } as PlayerActionAttack];
          } else {
            actions = [];
          }
          if (monster.scriptedActions || combatant.spells.length > 0) {
            limitPlayerActionsToCost(combatant, { actions });
          }
          for (const action of actions.filter(a => a.type === PlayerActionType.Move)) {
            monsterMoves.push({ monster, action: action as PlayerActionMove });
          }
          entityActionsForLocations[locId].entities.push({
            entityType: EntityActionEntityTypes.monster,
            entityId: monster.id,
            entitySpeed: getMonsterStats(monster).speed * Math.random(),
            actions: actions.filter(a => a.type !== PlayerActionType.Move),
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

    // Retreats happen after combat, so opponents complete their actions first.
    for (const { monster, action } of monsterMoves) {
      if (monster.health <= 0) continue;
      const location = games.find(g => g.id === params.gameState.gameId)?.locations.find(l => l.id === monster.location);
      const move = location?.move.find(m => m.direction === action.direction);
      const blocked = params.blockedMoves.some(b => b.location === monster.location && b.direction === action.direction);
      if (move && !blocked) {
        playerMessageAtLocation(params, monster.id, `**{player}** moved ${action.direction}`);
        monster.location = move.id;
      }
    }
    for (const monster of params.monsters.filter(m => m.health > 0)) {
      const caster = getMonsterCombatant(monster);
      if (caster.spells.length > 0) {
        caster.magic = Math.min(caster.baseStats!.magic, caster.magic + Math.ceil(caster.baseStats!.magic * MAGIC_BONUS_RATIO));
      }
    }

    // Process player moves and healing (if still alive)
    for(const player of params.gameState.players) {
      if (player.health > 0) {
        characterRecovery(player, playerFought[player.id]);

        for(const moveAction of playerMoves[player.id]) {
          actionMove(params, player, moveAction);
        }

        for(const portalAction of playerPortals[player.id]) {
          actionPortal(params, player, portalAction);
        }

        for(const travelAction of playerFastTravels[player.id]) {
          actionFastTravel(params, player, travelAction);
        }

        // Recover following NPCs and move to the same location
        for(const npc of params.gameState.npcs.filter(npc => npc.health > 0 && npc.masterId === player.id)) {
          characterRecovery(npc, playerFought[player.id]);

          npc.location = {
            ...player.location,
          };
        }
      } else {
        for(const respawnAction of playerRespawns[player.id]) {
          actionRespawn(params, player);
        }

        if (player.respawnTurns !== undefined && player.respawnTurns > 0) {
          player.respawnTurns--;
        }
      }
    }
  } catch(error) {
    console.error('Error: runGameActions');
    throw error;
  }
}

async function retrieveActionsForNpc(params: BaseParams, npc: NPCState, masterIsMoving: boolean): Promise<PlayerActionsState> {
  return !masterIsMoving ? getNpcActions(params, npc) : { actions: [] };
}

function characterRecovery(character: INamedTarget, playerFought: boolean) {
  if (!playerFought && character.health < character.baseStats!.health) {
    character.health = Math.min(character.baseStats!.health,
        character.health + Math.ceil(character.baseStats!.health * HEAL_SCALING)
    );
  }
  if (character.magic < character.baseStats!.magic) {
    character.magic = Math.min(character.baseStats!.magic,
      character.magic + Math.ceil(character.baseStats!.magic * MAGIC_BONUS_RATIO)
    );
  }

}

function limitPlayerActionsToCost(playerState: INamedTarget, actionsState: PlayerActionsState) {
  const actionsPerTurn = getPlayerActionsPerTurn(playerState);
  while (getPlayerActionsCosts(playerState, actionsState) > actionsPerTurn.total) {
    // Remove the last action
    actionsState.actions.splice(actionsState.actions.length - 1, 1);
  }
}

async function processNextAction(params: BaseParams, entityActions: EntityActions, locationId: number): Promise<void> {
  try {
    const getPlayerById = (id: string) => params.gameState.players.find(p => p.id === id)!;
    const getNpcById = (id: string) => params.gameState.npcs.find(n => n.id === id)!;
    const getMonsterById = (id: string) => params.monsters.find(m => m.id === id)!;

    const nextAction = entityActions.actions.splice(0, 1)[0];

    const entityPlayerOrNpc = entityActions.entityType === EntityActionEntityTypes.player
        || entityActions.entityType === EntityActionEntityTypes.npc;

    if (entityPlayerOrNpc) {
      const character: INamedTarget = (entityActions.entityType === EntityActionEntityTypes.player)
        ? getPlayerById(entityActions.entityId)
        : getNpcById(entityActions.entityId);

      if (character && character.health > 0) {
        switch(nextAction.type) {
          case PlayerActionType.Attack:
            actionAttack(params, character, nextAction as PlayerActionAttack);
            break;
          case PlayerActionType.UseItem:
            actionUseItem(params, character, nextAction as PlayerActionUseItem);
            break;
          case PlayerActionType.Cast:
            actionCastSpell(params, character, nextAction as PlayerActionCast);
            break;
          case PlayerActionType.ReadScroll:
            if (entityActions.entityType === EntityActionEntityTypes.player) {
              actionReadScroll(params, character as PlayerState, nextAction as PlayerActionReadScroll);
            }
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
            if (target && target.health > 0 && target.location.id === monster.location) {
              monsterAttack(params, monster, target, locationId);
            }
            break;
          }
          case PlayerActionType.Cast:
            actionCastSpell(params, getMonsterCombatant(monster), nextAction as PlayerActionCast);
            break;
          case PlayerActionType.UseItem:
            actionUseItem(params, getMonsterCombatant(monster), nextAction as PlayerActionUseItem);
            break;
        }
      }
    }
  } catch(error) {
    console.error('Error: processNextAction', entityActions);
    throw error;
  }
}

function monsterPickTarget(targets: INamedTarget[], entityActionsForLocation: EntityActionsForLocation): INamedTarget {
  const targetWeights = targets.map(target => {
    const targetActions = entityActionsForLocation.entities.find( e => e.entityId === target.id);
    if (!targetActions || targetActions.actions.length === 0) {
      // No action (or leaving)
      return 0.3;
    }

    // Make the weights depending on whether they have an "attack" action without a ranged weapon
    if (!!targetActions.actions.find(a => a.type === PlayerActionType.Attack)) {
      const weaponId = target.equipped.weapon;
      const weapon = weaponId ? target.equipment.find(item => item.id === weaponId) as PlayerItem | undefined : undefined;
      const weaponType = weapon && allItems[weapon.type] as EquipableItemDef;

      if (!weaponType || !weaponType.ranged) {
        // Melee attack
        return 1;
      }
    }

    // Ranged attack or other action
    return 0.5;
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
  // Also include NPCs
  params.gameState.players.find(p => p.id === id)
    || params.gameState.npcs.find(npc => npc.id === id)!;
