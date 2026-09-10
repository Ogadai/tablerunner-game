import {
  PlayerState,
  MonsterState,
  PlayerActionAttack,
  INamedTarget,
  getMonsterName,
} from "../store/types";
import { monsters, getPointsForDamage, getMonsterStrength } from "../games/monsters";
import { BaseParams } from './base-params';
import { playerMessageAtLocation, soloMessageAtLocation } from './game-messages';
import { getMonsterStats } from './monster-stats';
import { ConsumableIds, ItemIds, lootItems } from "../games/items";
import { createItemForInventory } from "./apply-inventory";

const MAXIMUM_COIN_DROP = 100;
const AUTO_DROP_ITEMS: ItemIds[] = [ ConsumableIds.resurrectionStone, ConsumableIds.resurrectionShard ];
const PLAYER_ZOMBIE_RISK = 0.1;
const ZOMBIE_TURNS = 3;

export function processAttackForDamage(attackerStats: { attack: number, damage: number }, defenderStats: { defence: number }): number {
  const attackScore = Math.random() * attackerStats.attack;
  const defenseScore = Math.random() * defenderStats.defence;

  if (attackScore >= defenseScore) {
    return Math.ceil(Math.random() * attackerStats.damage);
  }

  return 0;
}

export function actionAttack(params: BaseParams, player: PlayerState, action: PlayerActionAttack): void {
  const monster = params.monsters.find(m => m.id === action.target)!;
  const success = genericAttackMonster(params, player, player.baseStats!, monster);

  if (success && player.zombie && !monster.zombie) {
    // Infected the monster
    monster.infected = ZOMBIE_TURNS;
  }
}

export function monsterAttack(
  params: BaseParams,
  monster: MonsterState,
  target: INamedTarget,
  locationId: number): void {
  try {
    const monsterStats = getMonsterStats(monster);

    const damage = processAttackForDamage(monsterStats, target.baseStats!);

    if (damage > 0) {
      target.health -= damage;
      if (target.health <= 0) {
        target.health = 0;
      }

      if (monster.zombie && !target.zombie && Math.random() < PLAYER_ZOMBIE_RISK) {
        target.infected = ZOMBIE_TURNS;
      }

      playerMessageAtLocation(params, target.id, `**${getMonsterName(monster)}** hit **{player}** for **${damage}** damage`);
      if (target.health <= 0) {
        playerMessageAtLocation(params, target.id, `**{player}** {playerNoun} **dead**!`);

        // auto drop special items if they have them
        const drops = target.equipment.filter(i => AUTO_DROP_ITEMS.includes(i.type as ItemIds));
        target.equipment = target.equipment.filter(i => !AUTO_DROP_ITEMS.includes(i.type as ItemIds));

        params.items.push(...drops.map(i => ({
          ...i,
          location: locationId
        })));
      }
    } else {
      playerMessageAtLocation(params, target.id, `**${getMonsterName(monster)}** missed **{player}**`);
    }
  } catch(error) {
    console.error(`Error: monsterAttack for ${monster.id} against ${target.id}`);
    throw error;
  }
}

export function genericAttackMonster(params: BaseParams, player: PlayerState, attackStats: { name?: string, attack: number, damage: number }, monster: MonsterState): boolean {
  try {
    if (monster && monster.health > 0) {
      const damage = processAttackForDamage(attackStats, getMonsterStats(monster));

      const attackName = attackStats.name
        ? `**{player}{possessive}** ${attackStats.name}`
        : '**{player}**';

      if (damage > 0) {
        const appliedDamage = Math.min(damage, monster.health);
        monster.health -= appliedDamage;
        if (monster.health <= 0) {
          monster.health = 0;
          monsterDropLoot(params, player, monster);
          monsterDropCoins(params, player, monster);
        }

        // Assign points to all living players at location
        const players = params.gameState.players.filter(p =>
          p.location.id === player.location.id && p.health > 0
        );

        const totalPoints = getPointsForDamage(monster.type, appliedDamage);
        for(const player of players) {
          player.points += Math.ceil(totalPoints / players.length);
        }

        playerMessageAtLocation(params, player.id, `${attackName} hit **${getMonsterName(monster)}** for **${appliedDamage}** damage${monster.health <= 0 ? ' and **defeated** it!' : ''}`);
        return true;
      } else {
        playerMessageAtLocation(params, player.id, `${attackName} missed **${getMonsterName(monster)}**`);
      }
    }
  } catch(error) {
    console.error(`Error: actionAttack for ${player.id}`);
    throw error;
  }
  return false;
}

function monsterDropCoins(params: BaseParams, player: PlayerState, monster: MonsterState) {
  const locationId = player.location.id;
  const monsterStrength = getMonsterStrength(monsters[monster.type]);
  const maximumCoins = Math.ceil(2 + monsterStrength * (MAXIMUM_COIN_DROP - 2));
  const droppedCoins = Math.ceil(Math.random() * maximumCoins);
  const locationCoins = params.coins.find(coins => coins.location === locationId);

  if (locationCoins) {
    locationCoins.coins += droppedCoins;
  } else {
    params.coins.push({ location: locationId, coins: droppedCoins });
  }

  const hasLivingMonster = params.monsters.some(currentMonster =>
    currentMonster.location === locationId && currentMonster.health > 0
  );

  if (!hasLivingMonster) {
    distributeLocationCoins(params, locationId);
  }
}

function distributeLocationCoins(params: BaseParams, locationId: number) {
  const locationCoins = params.coins.find(coins => coins.location === locationId);
  const players = params.gameState.players.filter(player =>
    player.location.id === locationId && player.health > 0
  );

  if (!locationCoins || players.length === 0) {
    return;
  }

  const coinsPerPlayer = Math.ceil(locationCoins.coins / players.length);
  if (coinsPerPlayer > 0) {
    for (const player of players) {
      soloMessageAtLocation(params, player.id, `**{player}** collected **${coinsPerPlayer}** coin${coinsPerPlayer > 1 ? 's' : ''}`);
      player.coins += coinsPerPlayer;
    }
  }

  params.coins.splice(params.coins.indexOf(locationCoins), 1);
}

function monsterDropLoot(params: BaseParams, player: PlayerState, monster: MonsterState) {
  const locationId = player.location.id;

  const monsterStrength = getMonsterStrength(monsters[monster.type]);
  const lootChance = 0.3 + monsterStrength * 0.6;

  if (Math.random() >= lootChance) {
    return;
  }

  const maxLootValue = 15 + monsterStrength * monsterStrength * 285;
  const availableLoot = lootItems.filter(item => (item.value ?? 0) <= maxLootValue);
  const lootItem = availableLoot[Math.floor(Math.random() * availableLoot.length)];

  if (lootItem) {
    params.items.push({
      ...createItemForInventory(params.gameState, lootItem),
      location: locationId,
    });
  }
}
