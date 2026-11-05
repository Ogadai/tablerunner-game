import { allItems } from '@/lib/games/items';
import { monsters } from '@/lib/games/monsters';
import { getNamedTargetStats } from '@/lib/store/playerStats';
import {
  AllLocationsState,
  GameState,
  INamedTarget,
  MonsterState,
  NPCState,
  PlayerInventoryState,
  PlayerState,
} from '@/lib/store/types';
import { createItemForInventory } from '../apply-inventory';
import { BaseParams } from '../base-params';
import { updateMonsterLeds } from '../game-action-monsters';
import { broadcastMessage, soloMessageAtLocation } from '../game-messages';
import { levelUpPlayer } from '../level-up';
import { getNpcEquipment, getNpcSpells, getNpcStats } from '../shared-processes/npcs';
import { ProcessRunner } from '../types';
import { generateQuestsForGame } from './quest-templates';
import { CauldronQuestsState, QuestInstance, QuestTier } from './quest-types';

export const QUESTS_PROCESS_OWNER = 'quests';
export const MAIN_QUEST_ID = 'quest-main-lich-king';
export const QUEST_LED_OWNER = 'quest';
export const QUEST_LED_RGB = 'FFFF00';

export function createMainStoryQuest(): QuestInstance {
  return {
    id: MAIN_QUEST_ID,
    templateId: 'main-defeat-lich-king',
    title: 'Defeat the Lich King',
    description: 'Storm the northern castle at Location 224 and destroy the Evil Lich King to save the realm!',
    category: 'slay_boss',
    scope: 'shared',
    tier: 'late',
    status: 'active',
    isMainQuest: true,
    offerLocation: 224,
    actualTargetLocation: 224,
    hintLocations: [224],
    bossName: 'The Evil Lich King',
    monsterType: 'lich',
    spawnedMonsterId: 'lich-king',
    reward: { coins: 500, points: 1000 },
  };
}

export function isQuestItemCarried(quest: QuestInstance, gameState: GameState): boolean {
  const matchesQuestItem = (item: { id: string; type: string }) =>
    (quest.spawnedItemId && item.id === quest.spawnedItemId) ||
    (!quest.spawnedItemId && quest.itemType && item.type === quest.itemType);

  for (const p of gameState.players) {
    if (p.equipment?.some(matchesQuestItem)) return true;
  }
  for (const n of gameState.npcs) {
    if (n.equipment?.some(matchesQuestItem)) return true;
  }
  return false;
}

export interface QuestTargetLocation {
  location: number;
  allowVisited?: boolean;
}

export function getActiveQuestTargetLocations(
  quest: QuestInstance,
  gameState: GameState,
): QuestTargetLocation[] {
  if (quest.status !== 'active') return [];

  switch (quest.category) {
    case 'retrieve_item': {
      if (isQuestItemCarried(quest, gameState)) {
        // Return location was already visited when accepting the quest, but must be lit to guide the return
        return [{ location: quest.offerLocation, allowVisited: true }];
      }
      const hints = quest.hintLocations && quest.hintLocations.length > 0
        ? quest.hintLocations
        : quest.actualTargetLocation !== undefined
          ? [quest.actualTargetLocation]
          : [quest.offerLocation];
      return hints.map(location => ({ location, allowVisited: false }));
    }
    case 'deliver_item': {
      const dest = quest.destinationLocation ?? quest.offerLocation;
      return [{ location: dest, allowVisited: true }];
    }
    case 'escort_npc': {
      const dest = quest.destinationLocation ?? quest.offerLocation;
      return [{ location: dest, allowVisited: true }];
    }
    case 'rescue_npc': {
      if (quest.npcRescued) {
        const dest = quest.destinationLocation ?? quest.offerLocation;
        return [{ location: dest, allowVisited: true }];
      }
      const hints = quest.hintLocations && quest.hintLocations.length > 0
        ? quest.hintLocations
        : quest.actualTargetLocation !== undefined
          ? [quest.actualTargetLocation]
          : [quest.offerLocation];
      return hints.map(location => ({ location, allowVisited: false }));
    }
    case 'clear_dungeon':
      return (quest.targetLocations || []).map(location => ({ location, allowVisited: false }));
    case 'slay_boss': {
      const hints = quest.hintLocations && quest.hintLocations.length > 0
        ? quest.hintLocations
        : quest.actualTargetLocation !== undefined
          ? [quest.actualTargetLocation]
          : [quest.offerLocation];
      return hints.map(location => ({ location, allowVisited: false }));
    }
    case 'scout_area':
      return (quest.targetLocations || [])
        .filter(loc => !(quest.scoutedLocations || []).includes(loc))
        .map(location => ({ location, allowVisited: false }));
    default:
      return [];
  }
}

export function updateQuestLeds(gameState: GameState, quests?: QuestInstance[]): void {
  const questsList = quests ?? getQuestsState(gameState).quests;
  const targetLocations = new Set<number>();

  for (const quest of questsList) {
    if (quest.status !== 'active') continue;
    const targets = getActiveQuestTargetLocations(quest, gameState);
    for (const target of targets) {
      if (target.allowVisited || !gameState.visited.includes(target.location)) {
        targetLocations.add(target.location);
      }
    }
  }

  const questLeds = Array.from(targetLocations)
    .map(location => ({
      location,
      rgb: QUEST_LED_RGB,
      owner: QUEST_LED_OWNER,
    }))
    .filter(ql => !gameState.leds.some(l => l.owner !== QUEST_LED_OWNER && l.location === ql.location));

  gameState.leds = [
    ...gameState.leds.filter(l => l.owner !== QUEST_LED_OWNER),
    ...questLeds,
  ];
}

const DUNGEON_MONSTER_POOLS: Record<QuestTier, string[]> = {
  early: ['goblin', 'spider', 'snake', 'orc', 'skeleton'],
  mid: ['orc', 'troll', 'ghoul', 'wyvern', 'minotaur'],
  late: ['minotaur', 'ogre', 'rocktroll', 'cyclops', 'squizard'],
};

export function getQuestsState(gameState: GameState): CauldronQuestsState {
  const existing = gameState.processState?.[QUESTS_PROCESS_OWNER] as CauldronQuestsState | undefined;
  return {
    quests: existing?.quests ? existing.quests.map(q => ({ ...q })) : [],
  };
}

export function saveQuestsState(gameState: GameState, state: CauldronQuestsState): void {
  gameState.processState[QUESTS_PROCESS_OWNER] = state;
}

export function isPlayerEligibleForQuest(quest: QuestInstance, playerId: string): boolean {
  if (quest.scope === 'shared') {
    return true;
  }
  return !quest.assignedPlayerId || quest.assignedPlayerId === playerId;
}

function buildQuestNpc(
  quest: QuestInstance,
  locationId: number,
  masterId: string | null,
  team: string,
): NPCState {
  const characterType = quest.npcCharacterType || 'ranger';
  const tierCost = quest.tier === 'early' ? 45 : quest.tier === 'mid' ? 65 : 85;
  const statsBuilder = getNpcStats[characterType] || getNpcStats.ranger;
  const rawStats = statsBuilder(tierCost);
  const baseStats = {
    ...rawStats,
    health: Math.max(12, rawStats.health),
  };

  const npcId = `quest-npc-${quest.id}`;
  const equipment = getNpcEquipment(npcId, characterType);
  const equipped = equipment.length > 0 ? { weapon: equipment[0].id } : {};
  const computedStats = getNamedTargetStats(baseStats, { equipment, equipped });

  return {
    id: npcId,
    characterType,
    masterId,
    name: quest.npcName || 'Traveller',
    location: { id: locationId, description: '', move: [] },
    magic: computedStats.magic,
    spells: getNpcSpells(characterType, tierCost).slice(0, 2),
    equipment,
    equipped,
    baseStats,
    hireCost: 0,
    iconXY: quest.npcIconXY || { x: 0, y: 0 },
    health: computedStats.health,
    team,
  };
}

export function activateQuest(
  quest: QuestInstance,
  player: PlayerState,
  gameState: GameState,
  locationsState: AllLocationsState,
  playerInventory?: PlayerInventoryState,
): { updatedLocationIds: number[] } {
  if (quest.status !== 'available') {
    throw new Error('Quest is no longer available');
  }
  if (player.health <= 0) {
    throw new Error('Cannot accept a quest while dead');
  }
  if (player.location.id !== quest.offerLocation) {
    throw new Error('You must be at the quest location to accept this quest');
  }
  if (!isPlayerEligibleForQuest(quest, player.id)) {
    throw new Error('This quest is only available to another hero');
  }

  quest.status = 'active';
  if (quest.scope === 'player') {
    quest.assignedPlayerId = player.id;
  }

  const updatedLocationIds = new Set<number>();

  switch (quest.category) {
    case 'retrieve_item': {
      const itemDef = allItems[quest.itemType!];
      const item = createItemForInventory(gameState, itemDef);
      quest.spawnedItemId = item.id;
      const targetLoc = quest.actualTargetLocation ?? quest.offerLocation;
      locationsState.items.push({
        ...item,
        location: targetLoc,
      });
      updatedLocationIds.add(targetLoc);
      break;
    }

    case 'deliver_item': {
      const itemDef = allItems[quest.itemType!];
      const item = createItemForInventory(gameState, itemDef);
      quest.spawnedItemId = item.id;
      player.equipment = [...player.equipment, item];
      if (playerInventory) {
        const baseEquipment = playerInventory.equipment !== null
          ? playerInventory.equipment.filter(existing => existing.id !== item.id)
          : player.equipment.filter(existing => existing.id !== item.id);
        playerInventory.equipment = [...baseEquipment, item];
        if (!playerInventory.equipped) {
          playerInventory.equipped = { ...player.equipped };
        }
      }
      break;
    }

    case 'escort_npc': {
      const npc = buildQuestNpc(quest, player.location.id, player.id, player.team || 'good');
      quest.spawnedNpcId = npc.id;
      gameState.npcs = [...gameState.npcs.filter(n => n.id !== npc.id), npc];
      locationsState.npcs = [...(locationsState.npcs || []).filter(n => n.id !== npc.id), { ...npc }];
      if (playerInventory) {
        const existingHired = playerInventory.hiredNpcIds || [];
        if (!existingHired.includes(npc.id)) {
          playerInventory.hiredNpcIds = [...existingHired, npc.id];
        }
      }
      updatedLocationIds.add(player.location.id);
      break;
    }

    case 'rescue_npc': {
      const targetLoc = quest.actualTargetLocation ?? quest.offerLocation;
      const eligibleAtTarget = gameState.players.find(
        p => p.health > 0 && p.location.id === targetLoc && isPlayerEligibleForQuest(quest, p.id),
      );
      const masterId = eligibleAtTarget ? eligibleAtTarget.id : null;
      quest.npcRescued = Boolean(eligibleAtTarget);
      const npc = buildQuestNpc(quest, targetLoc, masterId, player.team || 'good');
      quest.spawnedNpcId = npc.id;
      gameState.npcs = [...gameState.npcs.filter(n => n.id !== npc.id), npc];
      locationsState.npcs = [...(locationsState.npcs || []).filter(n => n.id !== npc.id), { ...npc }];
      updatedLocationIds.add(targetLoc);
      break;
    }

    case 'slay_boss': {
      const targetLoc = quest.actualTargetLocation ?? quest.offerLocation;
      const monsterType = quest.monsterType && monsters[quest.monsterType] ? quest.monsterType : 'ogre';
      const monsterDef = monsters[monsterType];
      const bossHealth = Math.ceil(monsterDef.baseStats.health * 1.5);
      const bossId = `quest-boss-${quest.id}`;
      quest.spawnedMonsterId = bossId;

      const bossMonster: MonsterState = {
        id: bossId,
        type: monsterType,
        location: targetLoc,
        health: bossHealth,
        magic: monsterDef.baseStats.magic,
        spells: monsterDef.spells ? [...monsterDef.spells] : undefined,
        team: 'monster',
      };
      locationsState.monsters.push(bossMonster);
      updateMonsterLeds(gameState, locationsState.monsters);
      updatedLocationIds.add(targetLoc);
      break;
    }

    case 'clear_dungeon': {
      const targets = quest.targetLocations || [];
      const existingMonsters = locationsState.monsters.filter(
        m => targets.includes(m.location) && m.health > 0 && m.team === 'monster',
      );
      const minMonstersNeeded = Math.max(0, 3 - existingMonsters.length);
      const spawnCount = Math.max(minMonstersNeeded, 2);
      const pool = DUNGEON_MONSTER_POOLS[quest.tier] || DUNGEON_MONSTER_POOLS.early;

      for (let i = 0; i < spawnCount && targets.length > 0; i++) {
        const loc = targets[i % targets.length];
        const mType = pool[Math.floor(Math.random() * pool.length)];
        const mDef = monsters[mType] || monsters.goblin;
        locationsState.monsters.push({
          id: `quest-pack-${quest.id}-${i + 1}`,
          type: mDef.id,
          location: loc,
          health: mDef.baseStats.health,
          magic: mDef.baseStats.magic,
          spells: mDef.spells ? [...mDef.spells] : undefined,
          team: 'monster',
        });
        updatedLocationIds.add(loc);
      }
      updateMonsterLeds(gameState, locationsState.monsters);
      break;
    }

    case 'scout_area': {
      const targets = quest.targetLocations || [];
      const scouted = new Set(quest.scoutedLocations || []);
      for (const p of gameState.players) {
        if (p.health > 0 && isPlayerEligibleForQuest(quest, p.id) && targets.includes(p.location.id)) {
          scouted.add(p.location.id);
        }
      }
      quest.scoutedLocations = [...scouted];
      break;
    }
  }

  return { updatedLocationIds: [...updatedLocationIds] };
}

function findAndRemoveQuestItemFromCarrier(
  quest: QuestInstance,
  carrier: INamedTarget,
  carrierInventory?: PlayerInventoryState,
): boolean {
  const matchesQuestItem = (item: { id: string; type: string }) =>
    (quest.spawnedItemId && item.id === quest.spawnedItemId) ||
    (!quest.spawnedItemId && quest.itemType && item.type === quest.itemType);

  const equipmentList = carrierInventory?.equipment != null ? carrierInventory.equipment : carrier.equipment;
  const foundItem = equipmentList.find(matchesQuestItem) || carrier.equipment.find(matchesQuestItem);
  if (!foundItem) {
    return false;
  }

  carrier.equipment = carrier.equipment.filter(i => i.id !== foundItem.id);
  if (carrierInventory && carrierInventory.equipment !== null) {
    carrierInventory.equipment = carrierInventory.equipment.filter(i => i.id !== foundItem.id);
  }
  return true;
}

export function distributeQuestReward(
  quest: QuestInstance,
  completingPlayer: PlayerState,
  gameState: GameState,
  paramsForMessages?: BaseParams,
  completingPlayerInventory?: PlayerInventoryState,
): void {
  quest.status = 'completed';
  quest.completedByPlayerId = completingPlayer.id;

  const rewardItemDef = quest.reward.itemId ? allItems[quest.reward.itemId] : undefined;
  let rewardItemName: string | undefined;

  if (rewardItemDef) {
    const createdItem = createItemForInventory(gameState, rewardItemDef);
    rewardItemName = rewardItemDef.name;
    completingPlayer.equipment = [...completingPlayer.equipment, createdItem];
    if (completingPlayerInventory) {
      const baseList = completingPlayerInventory.equipment !== null
        ? completingPlayerInventory.equipment.filter(i => i.id !== createdItem.id)
        : completingPlayer.equipment.filter(i => i.id !== createdItem.id);
      completingPlayerInventory.equipment = [...baseList, createdItem];
      if (!completingPlayerInventory.equipped) {
        completingPlayerInventory.equipped = { ...completingPlayer.equipped };
      }
    }
  }

  if (quest.scope === 'shared') {
    for (const p of gameState.players) {
      p.coins += quest.reward.coins;
      p.points += quest.reward.points;
      if (completingPlayerInventory && p.id === completingPlayer.id) {
        completingPlayerInventory.coins =
          (completingPlayerInventory.coins ?? (p.coins - quest.reward.coins)) + quest.reward.coins;
      }
      if (paramsForMessages) {
        levelUpPlayer(paramsForMessages, p);
      }
    }
    if (paramsForMessages) {
      const itemSuffix = rewardItemName ? ` **${completingPlayer.name}** also received **${rewardItemName}**!` : '';
      broadcastMessage(
        paramsForMessages,
        `***Quest Completed: ${quest.title}!*** Every hero earned **${quest.reward.coins} coins** and **${quest.reward.points} XP**!${itemSuffix}`,
      );
    }
  } else {
    completingPlayer.coins += quest.reward.coins;
    completingPlayer.points += quest.reward.points;
    if (completingPlayerInventory) {
      completingPlayerInventory.coins =
        (completingPlayerInventory.coins ?? (completingPlayer.coins - quest.reward.coins)) + quest.reward.coins;
    }
    if (paramsForMessages) {
      levelUpPlayer(paramsForMessages, completingPlayer);
      const itemSuffix = rewardItemName ? ` and **${rewardItemName}**` : '';
      soloMessageAtLocation(
        paramsForMessages,
        completingPlayer.id,
        `***Quest Completed: ${quest.title}!*** You earned **${quest.reward.coins} coins**, **${quest.reward.points} XP**${itemSuffix}!`,
      );
    }
  }
}

export function canClaimItemQuestTurnIn(
  quest: QuestInstance,
  player: PlayerState,
  npcs: NPCState[],
  playerInventory?: PlayerInventoryState,
): boolean {
  if (quest.status !== 'active') return false;
  if (player.health <= 0) return false;
  if (!isPlayerEligibleForQuest(quest, player.id)) return false;

  const turnInLocation = quest.category === 'retrieve_item'
    ? quest.offerLocation
    : quest.category === 'deliver_item'
      ? quest.destinationLocation
      : undefined;

  if (turnInLocation === undefined || player.location.id !== turnInLocation) {
    return false;
  }

  const matchesQuestItem = (item: { id: string; type: string }) =>
    (quest.spawnedItemId && item.id === quest.spawnedItemId) ||
    (!quest.spawnedItemId && quest.itemType && item.type === quest.itemType);

  const equipmentList = playerInventory?.equipment != null ? playerInventory.equipment : player.equipment;
  if (equipmentList.some(matchesQuestItem) || player.equipment.some(matchesQuestItem)) {
    return true;
  }

  const followerNpcs = npcs.filter(
    n => n.masterId === player.id && n.health > 0 && n.location.id === turnInLocation,
  );
  return followerNpcs.some(n => n.equipment.some(matchesQuestItem));
}

export function tryTurnInItemQuest(
  quest: QuestInstance,
  player: PlayerState,
  gameState: GameState,
  locationsState?: AllLocationsState,
  playerInventory?: PlayerInventoryState,
  paramsForMessages?: BaseParams,
): boolean {
  if (!canClaimItemQuestTurnIn(quest, player, gameState.npcs, playerInventory)) {
    return false;
  }

  let removed = findAndRemoveQuestItemFromCarrier(quest, player, playerInventory);
  if (!removed) {
    const followerNpcs = gameState.npcs.filter(
      n => n.masterId === player.id && n.health > 0 && n.location.id === player.location.id,
    );
    for (const npc of followerNpcs) {
      if (findAndRemoveQuestItemFromCarrier(quest, npc)) {
        const locNpc = locationsState?.npcs?.find(n => n.id === npc.id);
        if (locNpc) {
          locNpc.equipment = [...npc.equipment];
        }
        removed = true;
        break;
      }
    }
  }

  if (!removed) {
    return false;
  }

  distributeQuestReward(quest, player, gameState, paramsForMessages, playerInventory);
  return true;
}

export const questProcess: ProcessRunner = {
  async setup(params: BaseParams): Promise<void> {
    const mainQuest = createMainStoryQuest();
    const quests = [mainQuest, ...generateQuestsForGame(22, 28, [mainQuest.offerLocation])];
    saveQuestsState(params.gameState, { quests });
    updateQuestLeds(params.gameState, quests);
  },

  async executeForTurn(params: BaseParams): Promise<void> {
    const state = getQuestsState(params.gameState);
    if (state.quests.length === 0) return;

    for (const quest of state.quests) {
      if (quest.status !== 'active') continue;

      switch (quest.category) {
        case 'retrieve_item':
        case 'deliver_item': {
          const turnInLocation = quest.category === 'retrieve_item'
            ? quest.offerLocation
            : quest.destinationLocation;
          const eligiblePlayersHere = params.gameState.players.filter(
            p => p.health > 0 && p.location.id === turnInLocation && isPlayerEligibleForQuest(quest, p.id),
          );
          for (const player of eligiblePlayersHere) {
            if (tryTurnInItemQuest(quest, player, params.gameState, undefined, undefined, params)) {
              break;
            }
          }
          break;
        }

        case 'escort_npc': {
          const npc = params.gameState.npcs.find(n => n.id === quest.spawnedNpcId);
          if (!npc || npc.health <= 0) {
            quest.status = 'failed';
            params.gameState.npcs = params.gameState.npcs.filter(n => n.id !== quest.spawnedNpcId);
            const failMsg = `***Quest Failed: ${quest.title}!*** **${quest.npcName || 'The traveller'}** did not survive the journey.`;
            if (quest.scope === 'shared' || !quest.assignedPlayerId) {
              broadcastMessage(params, failMsg);
            } else {
              soloMessageAtLocation(params, quest.assignedPlayerId, failMsg);
            }
            break;
          }

          if (npc.location.id === quest.destinationLocation) {
            const completingPlayer =
              params.gameState.players.find(p => p.id === npc.masterId) ||
              params.gameState.players.find(p => p.location.id === quest.destinationLocation && isPlayerEligibleForQuest(quest, p.id)) ||
              params.gameState.players.find(p => p.id === quest.assignedPlayerId) ||
              params.gameState.players[0];

            params.gameState.npcs = params.gameState.npcs.filter(n => n.id !== quest.spawnedNpcId);
            if (completingPlayer) {
              distributeQuestReward(quest, completingPlayer, params.gameState, params);
            }
          }
          break;
        }

        case 'rescue_npc': {
          const npc = params.gameState.npcs.find(n => n.id === quest.spawnedNpcId);
          if (!npc || npc.health <= 0) {
            quest.status = 'failed';
            params.gameState.npcs = params.gameState.npcs.filter(n => n.id !== quest.spawnedNpcId);
            const failMsg = `***Quest Failed: ${quest.title}!*** **${quest.npcName || 'The captive'}** was slain before reaching safety.`;
            if (quest.scope === 'shared' || !quest.assignedPlayerId) {
              broadcastMessage(params, failMsg);
            } else {
              soloMessageAtLocation(params, quest.assignedPlayerId, failMsg);
            }
            break;
          }

          if (!npc.masterId) {
            const rescuer = params.gameState.players.find(
              p => p.health > 0 && p.location.id === npc.location.id && isPlayerEligibleForQuest(quest, p.id),
            );
            if (rescuer) {
              npc.masterId = rescuer.id;
              npc.team = rescuer.team || 'good';
              quest.npcRescued = true;
              soloMessageAtLocation(
                params,
                rescuer.id,
                `**${npc.name}** has joined your party! Escort them safely to **Location ${quest.destinationLocation}**.`,
              );
            }
          }

          if (npc.masterId && npc.location.id === quest.destinationLocation && npc.health > 0) {
            const completingPlayer =
              params.gameState.players.find(p => p.id === npc.masterId) ||
              params.gameState.players.find(p => p.id === quest.assignedPlayerId) ||
              params.gameState.players[0];

            params.gameState.npcs = params.gameState.npcs.filter(n => n.id !== quest.spawnedNpcId);
            if (completingPlayer) {
              distributeQuestReward(quest, completingPlayer, params.gameState, params);
            }
          }
          break;
        }

        case 'clear_dungeon': {
          const targetLocs = quest.targetLocations || [];
          const remainingMonsters = params.monsters.filter(
            m => targetLocs.includes(m.location) && m.health > 0 && m.team === 'monster',
          );
          if (remainingMonsters.length === 0) {
            const completingPlayer =
              params.gameState.players.find(
                p => p.health > 0 && targetLocs.includes(p.location.id) && isPlayerEligibleForQuest(quest, p.id),
              ) ||
              params.gameState.players.find(p => p.id === quest.assignedPlayerId) ||
              params.gameState.players.find(p => p.health > 0) ||
              params.gameState.players[0];

            if (completingPlayer) {
              distributeQuestReward(quest, completingPlayer, params.gameState, params);
            }
          }
          break;
        }

        case 'slay_boss': {
          const boss = params.monsters.find(m => m.id === quest.spawnedMonsterId);
          if (!boss || boss.health <= 0) {
            const completingPlayer =
              params.gameState.players.find(
                p => p.health > 0 && p.location.id === quest.actualTargetLocation && isPlayerEligibleForQuest(quest, p.id),
              ) ||
              params.gameState.players.find(p => p.id === quest.assignedPlayerId) ||
              params.gameState.players.find(p => p.health > 0) ||
              params.gameState.players[0];

            if (completingPlayer) {
              distributeQuestReward(quest, completingPlayer, params.gameState, params);
            }
          }
          break;
        }

        case 'scout_area': {
          const targetLocs = quest.targetLocations || [];
          const scouted = new Set(quest.scoutedLocations || []);
          let lastScouter: PlayerState | undefined;

          for (const player of params.gameState.players) {
            if (player.health > 0 && isPlayerEligibleForQuest(quest, player.id) && targetLocs.includes(player.location.id)) {
              if (!scouted.has(player.location.id)) {
                scouted.add(player.location.id);
                lastScouter = player;
                soloMessageAtLocation(
                  params,
                  player.id,
                  `You reconnoitered **Location ${player.location.id}** for **${quest.title}** (${scouted.size}/${targetLocs.length}).`,
                );
              }
            }
          }

          quest.scoutedLocations = [...scouted];
          if (targetLocs.length > 0 && targetLocs.every(loc => scouted.has(loc))) {
            const completingPlayer =
              lastScouter ||
              params.gameState.players.find(p => p.id === quest.assignedPlayerId) ||
              params.gameState.players.find(p => p.health > 0) ||
              params.gameState.players[0];

            if (completingPlayer) {
              distributeQuestReward(quest, completingPlayer, params.gameState, params);
            }
          }
          break;
        }
      }
    }

    updateQuestLeds(params.gameState, state.quests);
    saveQuestsState(params.gameState, state);
  },
};

