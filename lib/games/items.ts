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
    icon: 'sword-1.png',
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
    icon: 'bow-1.png',
    bonusStats: {
      attack: 1,
      damage: 1
    }
  },
  [WeaponIds.staffSkull]: {
    id: WeaponIds.staffSkull.toString(),
    type: PlayerItemType.weapon,
    name: 'Skull Staff',
    icon: 'staff-skull.png',
    bonusStats: {
      magic: 1,
      defence: 1,
    }
  },
  [WeaponIds.staffOrb]: {
    id: WeaponIds.staffOrb.toString(),
    type: PlayerItemType.weapon,
    name: 'Orb Staff',
    icon: 'staff-orb.png',
    bonusStats: {
      magic: 1,
      health: 1,
    }
  },
};

export const allItems: Record<WeaponIds, PlayerItem> = {
  ...weapons
};
