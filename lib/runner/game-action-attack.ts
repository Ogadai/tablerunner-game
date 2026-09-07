import {
  PlayerState,
  MonsterState,
} from "../store/types";
import { monsters, getPointsForDamage, getMonsterStrength } from "../games/monsters";
import { BaseParams } from './base-params';
import { playerMessageAtLocation } from './game-messages';
import { getMonsterStats } from './monster-stats';
import { lootItems } from "../games/items";
import { createItemForInventory } from "./apply-inventory";

export function processAttackForDamage(attackerStats: { attack: number, damage: number }, defenderStats: { defence: number }): number {
  const attackScore = Math.random() * attackerStats.attack;
  const defenseScore = Math.random() * defenderStats.defence;

  if (attackScore >= defenseScore) {
    return Math.ceil(Math.random() * attackerStats.damage);
  }

  return 0;
}

export function genericAttackMonster(params: BaseParams, player: PlayerState, attackStats: { name?: string, attack: number, damage: number }, monster: MonsterState): void {
  try {
    if (monster && monster.health > 0) {
      const monsterDef = monsters[monster.type];
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
        }

        // Assign points to all living players at location
        const players = params.gameState.players.filter(p =>
          p.location.id === player.location.id && p.health > 0
        );

        const totalPoints = getPointsForDamage(monster.type, appliedDamage);
        for(const player of players) {
          player.points += Math.ceil(totalPoints / players.length);
        }

        playerMessageAtLocation(params, player.id, `${attackName} hit **${monsterDef.name}** for **${appliedDamage}** damage${monster.health <= 0 ? ' and **defeated** it!' : ''}`);
      } else {
        playerMessageAtLocation(params, player.id, `${attackName} missed **${monsterDef.name}**`);
      }
    }
  } catch(error) {
    console.error(`Error: actionAttack for ${player.id}`);
    throw error;
  }
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
