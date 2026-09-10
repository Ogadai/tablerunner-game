import { CharacterListEntry } from "./types";
import { allItems } from './items';
import { SpellIds } from "./spells";

export const characters: { [id: string]: CharacterListEntry } = {
  barbarian: {
    id: 'barbarian',
    prompt: 'The Barbarian',
    description: 'A warrior who excels at hand-to-hand combat',
    iconXY: { x: 0, y: 0 },
    rgbColour: '403018',
    characterStats: {
      strength: 10,
      skill: 3,
      reactions: 4,
      resiliance: 8,
      intelligence: 1,
    },
    equipment: [
      allItems.swordRusty,
      allItems.healingPotion,
      allItems.healingPotion,
      allItems.resurrectionStore,
    ],
    spells: [],
  },
  witch: {
    id: 'witch',
    prompt: 'The Witch',
    description: 'A powerful user of the dark magical arts',
    iconXY: { x: 1, y: 0 },
    rgbColour: '411E47',
    characterStats: {
      strength: 3,
      skill: 4,
      reactions: 5,
      resiliance: 5,
      intelligence: 10,
    },
    equipment: [
      allItems.staffSkull,
      allItems.healingPotion,
      allItems.manaPotion,
      allItems.resurrectionStore,
      allItems.iceStormScroll,
    ],
    spells: [
      SpellIds.iceShards,
      SpellIds.fear,
    ],
  },
  ranger: {
    id: 'ranger',
    prompt: 'The Ranger',
    description: 'A skilled fighter specialising in ranged combat',
    iconXY: { x: 2, y: 0 },
    rgbColour: '303E15',
    characterStats: {
      strength: 6,
      skill: 10,
      reactions: 4,
      resiliance: 7,
      intelligence: 3,
    },
    equipment: [
      allItems.bowWarped,
      allItems.healingPotion,
      allItems.healingPotion,
      allItems.resurrectionStore,
    ],
    spells: [],
  },
  mage: {
    id: 'mage',
    prompt: 'The Mage',
    description: 'A learned magician of great skill',
    iconXY: { x: 3, y: 0 },
    rgbColour: '222F5B',
    characterStats: {
      strength: 4,
      skill: 3,
      reactions: 4,
      resiliance: 6,
      intelligence: 10,
    },
    equipment: [
      allItems.staffOrb,
      allItems.healingPotion,
      allItems.manaPotion,
      allItems.resurrectionStore,
      allItems.fireBallScroll,
    ],
    spells: [
      SpellIds.spiritArrow,
      SpellIds.heal,
    ],
  }
};
