import {
  PlayerActionMove,
  PlayerState,
  PlayerActionAttack,
  MonsterState,
  PlayerActionType,
  PlayerAction,
} from "../store/types";
import {
  getActionsStateFromRedis,
} from '../store/redis-access';
import { games } from "../games/games";
import { BaseStats, OPPOSITE_DIRECTION } from '@/lib/games/types';
import { monsters } from "../games/monsters";
import { BaseParams } from './base-params';
import { playerMessageAtLocation } from './game-messages';

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
          }
        }
      }
    }

    // Process player moves and healing (if still alive)
    for(const player of params.gameState.players) {
      if (player.health > 0) {
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
        monster.health -= damage;
        if (monster.health <= 0) {
          params.monsters = params.monsters.filter(m => m.id !== action.target);
        }

        playerMessageAtLocation(params, player.id, `**{player}** hit **${monsterDef.name}** for **${damage}** damage${monster.health <= 0 ? ' and **defeated** it!' : ''}`);
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
    return targets[Math.floor(Math.random() * targets.length)];
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
