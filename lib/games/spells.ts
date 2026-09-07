import { SpellDef, SpellTargetType } from './types';

export enum SpellIds {
  spiritArrow = 'spiritArrow',
};

export const spells: Record<string, SpellDef> = {
  [SpellIds.spiritArrow]: {
    id: SpellIds.spiritArrow.toString(),
    name: 'Spirit Arrow',
    pickTarget: true,
    targetType: SpellTargetType.enemy,
    magicCost: 2,
    actionCost: 8,
    iconXY: { x: 0, y: 0 },
    bonusStats: {
      damage: 6,
    }
  },
};
