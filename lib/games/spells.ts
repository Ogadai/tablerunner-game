import { NPC_DATA } from './npc-details';
import { SpellDef, SpellTargetType } from './types';
import type { INamedTarget, NPCState } from '../store/types';

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
  spiritGuide = 'spiritGuide',
  spiritGuarian = 'spiritGuarian',
  spiritWarrior = 'spiritWarrior',
  raiseDead = 'raiseDead',
  animateCorpse = 'animateCorpse',
  fireBreathSmall = 'fireBreathSmall',
  fireBreathLarge = 'fireBreathLarge',
  familiar = 'familiar',
};

export const spells: Record<string, SpellDef> = {
  [SpellIds.spiritArrow]: {
    id: SpellIds.spiritArrow.toString(),
    name: 'Spirit Arrow',
    characterType: 'mage',
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
    characterType: 'mage',
    intelligence: 15,
    pickTarget: true,
    targetType: SpellTargetType.enemy,
    magicCost: 5,
    actionCost: 9,
    iconXY: { x: 1, y: 0 },
    bonusStats: {
      damage: 15,
    },
    damageType: 'fire',
  },
  [SpellIds.fireWall]: {
    id: SpellIds.fireWall.toString(),
    name: 'Fire Wall',
    characterType: 'mage',
    intelligence: 20,
    pickTarget: false,
    targetType: SpellTargetType.enemy,
    magicCost: 8,
    actionCost: 13,
    iconXY: { x: 2, y: 0 },
    bonusStats: {
      damage: 8,
    },
    damageType: 'fire',
  },
  [SpellIds.iceShards]: {
    id: SpellIds.iceShards.toString(),
    name: 'Ice Shards',
    characterType: 'witch',
    intelligence: 10,
    pickTarget: true,
    targetType: SpellTargetType.enemy,
    magicCost: 3,
    actionCost: 8,
    iconXY: { x: 3, y: 0 },
    bonusStats: {
      damage: 8,
    },
    damageType: 'ice',
  },
  [SpellIds.iceStorm]: {
    id: SpellIds.iceStorm.toString(),
    name: 'Ice Storm',
    characterType: 'witch',
    intelligence: 17,
    pickTarget: false,
    targetType: SpellTargetType.enemy,
    magicCost: 7,
    actionCost: 14,
    iconXY: { x: 4, y: 0 },
    bonusStats: {
      damage: 6,
    },
    damageType: 'ice',
  },
  [SpellIds.heal]: {
    id: SpellIds.heal.toString(),
    name: 'Heal',
    characterType: 'mage',
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
    characterType: 'mage',
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
    characterType: 'witch',
    intelligence: 10,
    pickTarget: true,
    targetType: SpellTargetType.enemy,
    magicCost: 6,
    actionCost: 8,
    iconXY: { x: 5, y: 0 },
    bonusStats: {
      turns: 5,
      attack: -5,
      defence: -5,
    }
  },
  [SpellIds.terror]: {
    id: SpellIds.terror.toString(),
    name: 'Terror',
    characterType: 'witch',
    intelligence: 20,
    pickTarget: false,
    targetType: SpellTargetType.enemy,
    magicCost: 9,
    actionCost: 14,
    iconXY: { x: 6, y: 0 },
    bonusStats: {
      turns: 3,
      attack: -5,
      defence: -5,
    }
  },
  [SpellIds.shield]: {
    id: SpellIds.shield.toString(),
    name: 'Shield',
    characterType: 'mage',
    intelligence: 15,
    pickTarget: true,
    targetType: SpellTargetType.friend,
    magicCost: 8,
    actionCost: 8,
    iconXY: { x: 5, y: 1 },
    bonusStats: {
      turns: 5,
      defence: 5,
    }
  },
  [SpellIds.shieldWall]: {
    id: SpellIds.shieldWall.toString(),
    name: 'Shield Wall',
    characterType: 'mage',
    intelligence: 25,
    pickTarget: false,
    targetType: SpellTargetType.friend,
    magicCost: 12,
    actionCost: 12,
    iconXY: { x: 6, y: 1 },
    bonusStats: {
      turns: 4,
      defence: 4,
    }
  },  
  [SpellIds.strength]: {
    id: SpellIds.strength.toString(),
    name: 'Strength',
    characterType: 'mage',
    intelligence: 15,
    pickTarget: true,
    targetType: SpellTargetType.friend,
    magicCost: 8,
    actionCost: 8,
    iconXY: { x: 0, y: 2 },
    bonusStats: {
      turns: 5,
      attack: 5,
    }
  },
  [SpellIds.strengthAura]: {
    id: SpellIds.strengthAura.toString(),
    name: 'Strength Aura',
    characterType: 'mage',
    intelligence: 25,
    pickTarget: false,
    targetType: SpellTargetType.friend,
    magicCost: 12,
    actionCost: 12,
    iconXY: { x: 1, y: 2 },
    bonusStats: {
      turns: 5,
      attack: 4,
    }
  },  
  [SpellIds.lightning]: {
    id: SpellIds.lightning.toString(),
    name: 'Lightning',
    characterType: 'witch',
    intelligence: 30,
    pickTarget: false,
    targetType: SpellTargetType.enemy,
    magicCost: 15,
    actionCost: 13,
    iconXY: { x: 0, y: 3 },
    bonusStats: {
      damage: 15,
    }
  },
  [SpellIds.fireRain]: {
    id: SpellIds.fireRain.toString(),
    name: 'Fire Rain',
    characterType: 'mage',
    intelligence: 30,
    pickTarget: false,
    targetType: SpellTargetType.enemy,
    magicCost: 18,
    actionCost: 13,
    iconXY: { x: 1, y: 3 },
    bonusStats: {
      damage: 17,
    },
    damageType: 'fire',
  },
  [SpellIds.spiritGuide]: {
    id: SpellIds.spiritGuide.toString(),
    name: 'Spirit Guide',
    characterType: 'mage',
    intelligence: 12,
    pickTarget: false,
    targetType: SpellTargetType.friend,
    magicCost: 12,
    actionCost: 15,
    iconXY: { x: 4, y: 4 },
    bonusStats: {
      special: 'Summon a spirit guide'
    }
  },
  [SpellIds.spiritGuarian]: {
    id: SpellIds.spiritGuarian.toString(),
    name: 'Spirit Guardian',
    characterType: 'mage',
    intelligence: 21,
    pickTarget: false,
    targetType: SpellTargetType.friend,
    magicCost: 18,
    actionCost: 15,
    iconXY: { x: 3, y: 4 },
    bonusStats: {
      special: 'Summon a spirit guardian'
    }
  },
  [SpellIds.spiritWarrior]: {
    id: SpellIds.spiritWarrior.toString(),
    name: 'Spirit Warrior',
    characterType: 'mage',
    intelligence: 27,
    pickTarget: false,
    targetType: SpellTargetType.friend,
    magicCost: 24,
    actionCost: 15,
    iconXY: { x: 2, y: 4 },
    bonusStats: {
      special: 'Summon a spirit warrior'
    }
  },
  [SpellIds.raiseDead]: {
    id: SpellIds.raiseDead.toString(),
    name: 'Raise Dead',
    characterType: 'witch',
    intelligence: 15,
    pickTarget: false,
    targetType: SpellTargetType.friend,
    magicCost: 15,
    actionCost: 15,
    iconXY: { x: 1, y: 1 },
    bonusStats: {
      special: 'Raise a Skeleton from the earth'
    }
  },
  [SpellIds.animateCorpse]: {
    id: SpellIds.animateCorpse.toString(),
    name: 'Animate Corpse',
    characterType: 'witch',
    intelligence: 15,
    pickTarget: true,
    targetType: SpellTargetType.corpse,
    magicCost: 16,
    actionCost: 15,
    iconXY: { x: 6, y: 2 },
    bonusStats: {
      special: 'Animate a fallen character or monster'
    }
  },
  [SpellIds.fireBreathSmall]: {
    id: SpellIds.fireBreathSmall.toString(),
    name: 'Fire Breath',
    intelligence: 15,
    pickTarget: true,
    targetType: SpellTargetType.enemy,
    magicCost: 12,
    actionCost: 15,
    iconXY: { x: 1, y: 0 },
    bonusStats: {
      damage: 20,
    },
    damageType: 'fire',
  },
  [SpellIds.fireBreathLarge]: {
    id: SpellIds.fireBreathLarge.toString(),
    name: 'Fire Breath',
    intelligence: 25,
    pickTarget: false,
    targetType: SpellTargetType.enemy,
    magicCost: 20,
    actionCost: 15,
    iconXY: { x: 1, y: 0 },
    bonusStats: {
      damage: 20,
    },
    damageType: 'fire',
  },
  [SpellIds.familiar]: {
    id: SpellIds.familiar.toString(),
    name: 'Summon Familiar',
    intelligence: 20,
    pickTarget: false,
    targetType: SpellTargetType.friend,
    magicCost: 20,
    actionCost: 15,
    iconXY: { x: 0, y: 4 },
    bonusStats: {
      special: 'Summon a familiar as a minion'
    }
  },
};

export const getSpellActionCost = (spell: SpellDef, magic: number): number => {
  return Math.max(1, spell.actionCost - Math.floor(magic * MAGIC_ACTION_COST_REDUCTION));
}

export const getCharacterType = (character: Pick<INamedTarget, 'id'> & Partial<Pick<NPCState, 'characterType' | 'monsterType' | 'hireCost' | 'iconXY'>>): string | undefined => {
  if (character.characterType) return character.characterType;
  if ('masterId' in character && !character.monsterType && (character.hireCost || 0) > 0 && character.iconXY) {
    const npcType = NPC_DATA.find(entry => entry.iconXY.x === character.iconXY!.x && entry.iconXY.y === character.iconXY!.y)?.type;
    if (npcType) return npcType;
  }
  return character.id;
}

export const canCharacterUseSpell = (character: Pick<INamedTarget, 'id'> & Partial<Pick<NPCState, 'characterType' | 'monsterType' | 'hireCost' | 'iconXY'>>, spell: SpellDef | undefined): boolean => {
  if (!spell) return false;
  if (!spell.characterType) return true;
  return getCharacterType(character) === spell.characterType;
}
