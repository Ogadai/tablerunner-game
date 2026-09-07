import { SpellDef, SpellTargetType } from './types';

const MAGIC_ACTION_COST_REDUCTION = 0.1;

export enum SpellIds {
  spiritArrow = 'spiritArrow',
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
};

export const getSpellActionCost = (spell: SpellDef, magic: number): number => {
  return Math.max(1, spell.actionCost - Math.floor(magic * MAGIC_ACTION_COST_REDUCTION));
}