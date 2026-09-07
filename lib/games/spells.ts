import { SpellDef, SpellTargetType } from './types';

const MAGIC_ACTION_COST_REDUCTION = 0.1;

export enum SpellIds {
  spiritArrow = 'spiritArrow',
  fireBall = 'fireBall',
  fireWall = 'fireWall',
  iceShards = 'iceShards',
  iceStorm = 'iceStorm',
};

export const spells: Record<string, SpellDef> = {
  [SpellIds.spiritArrow]: {
    id: SpellIds.spiritArrow.toString(),
    name: 'Spirit Arrow',
    intelligence: 10,
    pickTarget: true,
    targetType: SpellTargetType.enemy,
    magicCost: 2,
    actionCost: 8,
    iconXY: { x: 0, y: 0 },
    bonusStats: {
      damage: 6,
    }
  },
  [SpellIds.fireBall]: {
    id: SpellIds.fireBall.toString(),
    name: 'Fire Ball',
    intelligence: 15,
    pickTarget: true,
    targetType: SpellTargetType.enemy,
    magicCost: 5,
    actionCost: 9,
    iconXY: { x: 1, y: 0 },
    bonusStats: {
      damage: 15,
    }
  },
  [SpellIds.fireWall]: {
    id: SpellIds.fireWall.toString(),
    name: 'Fire Wall',
    intelligence: 20,
    pickTarget: false,
    targetType: SpellTargetType.enemy,
    magicCost: 8,
    actionCost: 13,
    iconXY: { x: 2, y: 0 },
    bonusStats: {
      damage: 8,
    }
  },
  [SpellIds.iceShards]: {
    id: SpellIds.iceShards.toString(),
    name: 'Ice Shards',
    intelligence: 10,
    pickTarget: true,
    targetType: SpellTargetType.enemy,
    magicCost: 3,
    actionCost: 8,
    iconXY: { x: 0, y: 0 },
    bonusStats: {
      damage: 8,
    }
  },
  [SpellIds.iceStorm]: {
    id: SpellIds.iceStorm.toString(),
    name: 'Ice Storm',
    intelligence: 17,
    pickTarget: false,
    targetType: SpellTargetType.enemy,
    magicCost: 7,
    actionCost: 14,
    iconXY: { x: 0, y: 0 },
    bonusStats: {
      damage: 6,
    }
  },
};

export const getSpellActionCost = (spell: SpellDef, magic: number): number => {
  return Math.max(1, spell.actionCost - Math.floor(magic * MAGIC_ACTION_COST_REDUCTION));
}