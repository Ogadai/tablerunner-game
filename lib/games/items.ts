import { PlayerItem, PlayerItemType, PlayerEquipableItem } from './types';

export enum EquipableIds {
  swordRusty = 'swordRusty',
  bowWarped = 'bowWarped',
  staffSkull = 'staffSkull',
  staffOrb = 'staffOrb',
};

export const equipableItems: Record<EquipableIds, PlayerEquipableItem> = {
  [EquipableIds.swordRusty]: {
    id: EquipableIds.swordRusty.toString(),
    type: PlayerItemType.weapon,
    name: 'Rusty Sword',
    iconXY: { x: 0, y: 0 },
    bonusStats: {
      attack: 1,
      damage: 1
    }
  },
  [EquipableIds.bowWarped]: {
    id: EquipableIds.bowWarped.toString(),
    type: PlayerItemType.weapon,
    name: 'Warped Bow',
    ranged: true,
    iconXY: { x: 6, y: 0 },
    bonusStats: {
      attack: 1,
      damage: 1
    }
  },
  [EquipableIds.staffSkull]: {
    id: EquipableIds.staffSkull.toString(),
    type: PlayerItemType.weapon,
    name: 'Skull Staff',
    iconXY: { x: 4, y: 1 },
    bonusStats: {
      magic: 1,
      defence: 1,
    }
  },
  [EquipableIds.staffOrb]: {
    id: EquipableIds.staffOrb.toString(),
    type: PlayerItemType.weapon,
    name: 'Orb Staff',
    iconXY: { x: 1, y: 1 },
    bonusStats: {
      magic: 1,
      health: 1,
    }
  },
};

export enum ConsumableIds {
  healingPotion = 'healingPotion',
};

export const consumableItems: Record<ConsumableIds, PlayerItem> = {
  [ConsumableIds.healingPotion]: {
    id: ConsumableIds.healingPotion.toString(),
    type: PlayerItemType.consumable,
    name: 'Minor Healing Potion',
    iconXY: { x: 0, y: 7 },
    bonusStats: {
      health: 5,
    }
  },
};

export type ItemIds = EquipableIds | ConsumableIds;

export const allItems: Record<ItemIds, PlayerItem> = {
  ...equipableItems,
  ...consumableItems,
};
