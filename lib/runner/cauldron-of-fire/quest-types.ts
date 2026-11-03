import { SpecialIds } from '@/lib/games/items';

export type QuestCategory =
  | 'retrieve_item'
  | 'deliver_item'
  | 'escort_npc'
  | 'rescue_npc'
  | 'clear_dungeon'
  | 'slay_boss'
  | 'scout_area';

export type QuestScope = 'shared' | 'player';
export type QuestTier = 'early' | 'mid' | 'late';
export type QuestStatus = 'available' | 'active' | 'completed' | 'failed';

export interface QuestReward {
  coins: number;
  points: number;
  itemId?: string;
}

export interface QuestInstance {
  id: string;
  templateId: string;
  title: string;
  description: string;
  category: QuestCategory;
  scope: QuestScope;
  tier: QuestTier;
  status: QuestStatus;
  isMainQuest?: boolean;
  offerLocation: number;
  assignedPlayerId?: string;
  completedByPlayerId?: string;
  reward: QuestReward;

  // Item quests (retrieve_item, deliver_item)
  itemType?: SpecialIds;
  spawnedItemId?: string;

  // Target & hint locations (retrieve_item, rescue_npc, slay_boss)
  actualTargetLocation?: number;
  hintLocations?: number[];

  // Destination location (deliver_item, escort_npc, rescue_npc)
  destinationLocation?: number;

  // NPC quests (escort_npc, rescue_npc)
  npcName?: string;
  npcCharacterType?: 'barbarian' | 'witch' | 'ranger' | 'mage';
  npcIconXY?: { x: number; y: number };
  spawnedNpcId?: string;
  npcRescued?: boolean;

  // Area quests (clear_dungeon, scout_area)
  areaName?: string;
  targetLocations?: number[];
  scoutedLocations?: number[];

  // Boss quests (slay_boss)
  bossName?: string;
  monsterType?: string;
  spawnedMonsterId?: string;
}

export interface CauldronQuestsState {
  quests: QuestInstance[];
}

