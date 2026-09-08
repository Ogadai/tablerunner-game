import { SpellDef, SpellTargetType } from './types';

const MAGIC_ACTION_COST_REDUCTION = 0.1;

export enum SpellIds {
  spiritArrow = 'spiritArrow',
  fireBall = 'fireBall',
  fireWall = 'fireWall',
  iceShards = 'iceShards',
  iceStorm = 'iceStorm',
  heal = 'heal',
  healingAura = 'healingAura',
  fear = 'fear',
  terror = 'terror',
  shield = 'shield',
  shieldWall = 'shieldWall',
  strength = 'strength',
  strengthAura = 'strengthAura',
  lightning = 'lightning',
  fireRain = 'fireRain',
};

export const spells: Record<string, SpellDef> = {
  [SpellIds.spiritArrow]: {
    id: SpellIds.spiritArrow.toString(),
    name: 'Spirit Arrow',
    intelligence: 10,
    pickTarget: true,
    targetType: SpellTargetType.enemy,
    magicCost: 3,
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
    iconXY: { x: 3, y: 0 },
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
    iconXY: { x: 4, y: 0 },
    bonusStats: {
      damage: 6,
    }
  },
  [SpellIds.heal]: {
    id: SpellIds.heal.toString(),
    name: 'Heal',
    intelligence: 10,
    pickTarget: true,
    targetType: SpellTargetType.friend,
    magicCost: 5,
    actionCost: 12,
    iconXY: { x: 3, y: 1 },
    bonusStats: {
      health: 5,
    }
  },
  [SpellIds.healingAura]: {
    id: SpellIds.healingAura.toString(),
    name: 'Healing Aura',
    intelligence: 20,
    pickTarget: false,
    targetType: SpellTargetType.friend,
    magicCost: 15,
    actionCost: 18,
    iconXY: { x: 4, y: 1 },
    bonusStats: {
      health: 5,
    }
  },
  [SpellIds.fear]: {
    id: SpellIds.fear.toString(),
    name: 'Fear',
    intelligence: 10,
    pickTarget: true,
    targetType: SpellTargetType.enemy,
    magicCost: 6,
    actionCost: 8,
    iconXY: { x: 5, y: 0 },
    bonusStats: {
      special: 'Lower enemy attack and defence for 3 turns',
    }
  },
  [SpellIds.terror]: {
    id: SpellIds.terror.toString(),
    name: 'Terror',
    intelligence: 20,
    pickTarget: false,
    targetType: SpellTargetType.enemy,
    magicCost: 9,
    actionCost: 14,
    iconXY: { x: 6, y: 0 },
    bonusStats: {
      special: 'Lower all enemy attack and defence for 2 turns',
    }
  },
  [SpellIds.shield]: {
    id: SpellIds.shield.toString(),
    name: 'Shield',
    intelligence: 15,
    pickTarget: true,
    targetType: SpellTargetType.friend,
    magicCost: 8,
    actionCost: 8,
    iconXY: { x: 5, y: 1 },
    bonusStats: {
      defence: 5,
    }
  },
  [SpellIds.shieldWall]: {
    id: SpellIds.shieldWall.toString(),
    name: 'Shield Wall',
    intelligence: 25,
    pickTarget: false,
    targetType: SpellTargetType.friend,
    magicCost: 12,
    actionCost: 12,
    iconXY: { x: 6, y: 1 },
    bonusStats: {
      defence: 4,
    }
  },  
  [SpellIds.strength]: {
    id: SpellIds.strength.toString(),
    name: 'Strength',
    intelligence: 15,
    pickTarget: true,
    targetType: SpellTargetType.friend,
    magicCost: 8,
    actionCost: 8,
    iconXY: { x: 0, y: 2 },
    bonusStats: {
      attack: 5,
    }
  },
  [SpellIds.strengthAura]: {
    id: SpellIds.strengthAura.toString(),
    name: 'Strength Aura',
    intelligence: 25,
    pickTarget: false,
    targetType: SpellTargetType.friend,
    magicCost: 12,
    actionCost: 12,
    iconXY: { x: 1, y: 2 },
    bonusStats: {
      attack: 4,
    }
  },  
  [SpellIds.lightning]: {
    id: SpellIds.lightning.toString(),
    name: 'Lightning',
    intelligence: 30,
    pickTarget: false,
    targetType: SpellTargetType.enemy,
    magicCost: 12,
    actionCost: 13,
    iconXY: { x: 0, y: 3 },
    bonusStats: {
      damage: 15,
    }
  },
  [SpellIds.fireRain]: {
    id: SpellIds.fireRain.toString(),
    name: 'Fire Rain',
    intelligence: 30,
    pickTarget: false,
    targetType: SpellTargetType.enemy,
    magicCost: 13,
    actionCost: 13,
    iconXY: { x: 1, y: 3 },
    bonusStats: {
      damage: 17,
    }
  },
};

export const getSpellActionCost = (spell: SpellDef, magic: number): number => {
  return Math.max(1, spell.actionCost - Math.floor(magic * MAGIC_ACTION_COST_REDUCTION));
}
