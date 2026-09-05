import {
  PlayerActionMove,
  PlayerState,
  PlayerActionAttack,
  MonsterState,
  PlayerActionType,
  PlayerAction,
  PlayerActionsState,
  PlayerActionUseItem,
} from "../store/types";
import {
  getActionsStateFromRedis,
} from '../store/redis-access';
import { games } from "../games/games";
import { BaseStats, OPPOSITE_DIRECTION, PlayerConsumableItem, PlayerEquipableItem, PlayerItemType } from '@/lib/games/types';
import { monsters, getPointsForDamage } from "../games/monsters";
import { BaseParams } from './base-params';
import { playerMessageAtLocation, soloMessageAtLocation } from './game-messages';
import { getPlayerActionsPerTurn, getPlayerActionsCosts } from '../store/playerStats';
import { ConsumableIds } from "../games/items";

enum EntityActionEntityTypes {
  player,
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

export async function runGameActions(params: BaseParams): Promise<void> {
  const entityActionsForLocations: Record<string, EntityActionsForLocation> = {};
  const playerMoves: Record<string, PlayerActionMove[]> = {};
  const playerFought: Record<string, boolean> = {};

  const getPlayerById = (id: string) => params.gameState.players.find(p => p.id === id)!;

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

      // Filter out the moves
      playerMoves[player.id] = playerActionState.actions
        .filter(a => a.type === PlayerActionType.Move)
        .map(a => a as PlayerActionMove);

      const playerOtheractions = playerActionState.actions
        .filter(a => a.type !== PlayerActionType.Move);

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
      const monstersAtLocation = params.monsters.filter(m => m.location === locationId);

      if (monstersAtLocation.length > 0) {
        const targetsAtLocation = entityActionsForLocations[locId].entities
            .filter(e => e.entityType === EntityActionEntityTypes.player)
            .map(e => getPlayerById(e.entityId));

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
            entitySpeed: monsters[monster.type].baseStats!.speed * Math.random(),
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
            await processNextAction(params, entityActions);
            moreActions = true;
          }
        }
      }
    }

    // Process player moves and healing (if still alive)
    for(const player of params.gameState.players) {
      if (player.health > 0 && !player.zombie) {
        if (!playerFought[player.id] && player.health < player.baseStats!.health) {
          player.health++;
        }

        for(const moveAction of playerMoves[player.id]) {
          actionMove(params, player, moveAction);
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

async function processNextAction(params: BaseParams, entityActions: EntityActions): Promise<void> {
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
        }
      }
    } else if (entityActions.entityType === EntityActionEntityTypes.monster) {
      const monster = getMonsterById(entityActions.entityId);
      if (monster) {
        switch(nextAction.type) {
          case PlayerActionType.Attack:
          {
            const attackAction = nextAction as PlayerActionAttack
            const player = getPlayerById(attackAction.target);
            if (player.health > 0) {
              monsterAttack(params, monster, player);
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

function actionMove(params: BaseParams, player: PlayerState, action: PlayerActionMove): void {
  try {
    const gameDef = games.find(g => g.id === params.gameState.gameId)!;

    const currentLocation = gameDef.locations.find(l => l.id === player.location.id)!;
    const locationMove = currentLocation.move.find(m => m.direction === action.direction);

    if (locationMove) {
      const newLocation = gameDef.locations.find(l => l.id === locationMove.id)!;

      player.location = newLocation;
      player.retreatDirection = OPPOSITE_DIRECTION[action.direction];
      params.gameState.visited = [
        ...params.gameState.visited.filter(v => v !== locationMove.id),
        locationMove.id
      ]
    }
  } catch(error) {
    console.error(`Error: actionMove for ${player.id}`, action);
    throw error;
  }
}

function actionAttack(params: BaseParams, player: PlayerState, action: PlayerActionAttack): void {
  try {
    const monster = params.monsters.find(m => m.id === action.target);

    if (monster) {
      const monsterDef = monsters[monster.type];
      const damage = processAttackForDamage(player.baseStats!, monsterDef.baseStats);

      if (damage > 0) {
        const appliedDamage = Math.min(damage, monster.health);
        monster.health -= appliedDamage;
        if (monster.health <= 0) {
          params.monsters = params.monsters.filter(m => m.id !== action.target);
        }

        // Assign points to all living players at location
        const players = params.gameState.players.filter(p =>
          p.location.id === player.location.id && p.health > 0
        );

        const totalPoints = getPointsForDamage(monster.type, appliedDamage);
        for(const player of players) {
          player.points += Math.ceil(totalPoints / players.length);
        }

        playerMessageAtLocation(params, player.id, `**{player}** hit **${monsterDef.name}** for **${appliedDamage}** damage${monster.health <= 0 ? ' and **defeated** it!' : ''}`);
      } else {
        playerMessageAtLocation(params, player.id, `**{player}** missed **${monsterDef.name}**`);
      }
    }
  } catch(error) {
    console.error(`Error: actionAttack for ${player.id}`, action);
    throw error;
  }
}

function monsterPickTarget(targets: PlayerState[]): PlayerState {
  const targetWeights = targets.map(target => {
    const weaponId = target.equipped.weapon;
    const weapon = weaponId ? target.equipment.find(item => item.id === weaponId) as PlayerEquipableItem | undefined : undefined;
    const hasRangedOrStaffWeapon = !!weapon?.ranged || !!weapon?.staff;

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

function monsterAttack(params: BaseParams, monster: MonsterState, target: PlayerState): void {
  try {
    const monsterDef = monsters[monster.type];

    const damage = processAttackForDamage(monsterDef.baseStats, target.baseStats!);

    if (damage > 0) {
      target.health -= damage;
      if (target.health <= 0) {
        target.health = 0;
      }

      playerMessageAtLocation(params, target.id, `**${monsterDef.name}** hit **{player}** for **${damage}** damage`);
      if (target.health <= 0) {
        playerMessageAtLocation(params, target.id, `**{player}** {playerNoun} **dead**!`);
      }
    } else {
      playerMessageAtLocation(params, target.id, `**${monsterDef.name}** missed **{player}**`);
    }
  } catch(error) {
    console.error(`Error: monsterAttack for ${monster.id} against ${target.id}`);
    throw error;
  }
}

function processAttackForDamage(attackerStats: BaseStats, defenderStats: BaseStats): number {
  const attackScore = Math.random() * attackerStats.attack;
  const defenseScore = Math.random() * defenderStats.defence;

  if (attackScore >= defenseScore) {
    return Math.ceil(Math.random() * attackerStats.damage);
  }

  return 0;
}

function actionUseItem(params: BaseParams, player: PlayerState, action: PlayerActionUseItem): void {
  const item = player.equipment.find(item => item.type === PlayerItemType.consumable
    && (item as PlayerConsumableItem).uniqueId === action.uniqueId);
  if (item) {
    const consumableItem = item as PlayerConsumableItem;

    // Apply benefit
    if (consumableItem.bonusStats?.health) {
      const addedHealth = Math.min(consumableItem.bonusStats?.health,
        player.baseStats!.health - player.health);
      player.health += addedHealth;

      soloMessageAtLocation(params, player.id,
        `**You** drank **${consumableItem.name}** for **${addedHealth}** health!`);
    }
    
    if (consumableItem.id === ConsumableIds.resurrectionStone
      || consumableItem.id === ConsumableIds.resurrectionShard
    ) {
      useResurrectionStone(params, player,
        consumableItem.id === ConsumableIds.resurrectionShard
      );
    }

    // Remove from equipment
    player.equipment = player.equipment.filter(item => item.type !== PlayerItemType.consumable
      || (item as PlayerConsumableItem).uniqueId !== action.uniqueId)
  }
}

function useResurrectionStone(params: BaseParams, player: PlayerState, alwaysZombies: boolean) {
  // Find dead players at location
  const deadPlayers = params.gameState.players.filter(p => p.health === 0);
  if (deadPlayers.length == 0) {
    playerMessageAtLocation(params, player.id, `**{player}** wasted a resurrection stone`);
    return;
  }

  const zombies = alwaysZombies || deadPlayers.length > 1;
  const zombieMsg = alwaysZombies
    ? ', it sparks and crackles!'
    : (zombies ? ', but its power was divided!' : '')

  playerMessageAtLocation(params, player.id,
    `**{player}** used a${alwaysZombies ? ' cracked' : ''} resurrection stone${zombieMsg}`
  );

  for(const deadPlayer of deadPlayers) {
    deadPlayer.health = 1;

    if (zombies) {
      playerMessageAtLocation(params, deadPlayer.id, `The body of **{player}** has been **reanimated**!`);
      deadPlayer.name = `Zombie ${deadPlayer.name.split(' ')[0]}`;
      deadPlayer.zombie = true;
    } else {
      playerMessageAtLocation(params, deadPlayer.id, `**{player}** has been **resurrected**!`);
    }
  }
}