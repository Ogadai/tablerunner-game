import { PlayerItem, PlayerItemType, PlayerEquipableItem } from './types';

export enum WeaponIds {
  swordRusty = 'swordRusty',
  bowWarped = 'bowWarped',
  staffSkull = 'staffSkull',
  staffOrb = 'staffOrb',
};

export const weapons: Record<WeaponIds, PlayerEquipableItem> = {
  [WeaponIds.swordRusty]: {
    id: WeaponIds.swordRusty.toString(),
    type: PlayerItemType.weapon,
    name: 'Rusty Sword',
    iconXY: { x: 0, y: 0 },
    bonusStats: {
      attack: 1,
      damage: 1
    }
  },
  [WeaponIds.bowWarped]: {
    id: WeaponIds.bowWarped.toString(),
    type: PlayerItemType.weapon,
    name: 'Warped Bow',
    ranged: true,
    iconXY: { x: 6, y: 0 },
    bonusStats: {
      attack: 1,
      damage: 1
    }
  },
  [WeaponIds.staffSkull]: {
    id: WeaponIds.staffSkull.toString(),
    type: PlayerItemType.weapon,
    name: 'Skull Staff',
    iconXY: { x: 4, y: 1 },
    bonusStats: {
      magic: 1,
      defence: 1,
    }
  },
  [WeaponIds.staffOrb]: {
    id: WeaponIds.staffOrb.toString(),
    type: PlayerItemType.weapon,
    name: 'Orb Staff',
    iconXY: { x: 1, y: 1 },
    bonusStats: {
      magic: 1,
      health: 1,
    }
  },
};

export const allItems: Record<WeaponIds, PlayerItem> = {
  ...weapons
};
