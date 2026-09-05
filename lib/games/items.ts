import { PlayerItem, PlayerItemType, PlayerEquipableItem, PlayerConsumableItem } from './types';

export enum EquipableIds {
  swordRusty = 'swordRusty',
  swordSteel = 'swordSteel',
  swordLegendary = 'swordLegendary',
  swordArcane = 'swordArcane',
  swordInferno = 'swordInferno',
  axeHand = 'axeHand',
  axeBattle = 'axeBattle',
  axeWar = 'axeWar',
  hammer = 'hammer',
  warhammer = 'warhammer',
  dagger = 'dagger',
  daggerVenom = 'daggerVenom',
  bowWarped = 'bowWarped',
  bowLong = 'bowLong',
  bowElven = 'bowElven',
  crossbow = 'crossbow',
  staffSkull = 'staffSkull',
  staffOrb = 'staffOrb',
  staffRuby = 'staffRuby',
  staffCrystal = 'staffCrystal',
  shieldWooden = 'shieldWooden',
  shieldLion = 'shieldLion',
  shieldKnight = 'shieldKnight',
  shieldDemon = 'shieldDemon',
  armourLeather = 'armourLeather',
  armourStudded = 'armourStudded',
  armourChain = 'armourChain',
  armourPlate = 'armourPlate',
  armourShadow = 'armourShadow',
  helmetLeather = 'helmetLeather',
  helmetIron = 'helmetIron',
  helmetHorned = 'helmetHorned',
  helmetRoyal = 'helmetRoyal',
  glovesLeather = 'glovesLeather',
  glovesStudded = 'glovesStudded',
  glovesIron = 'glovesIron',
  glovesEnchanted = 'glovesEnchanted',
  bootsLeather = 'bootsLeather',
  bootsIron = 'bootsIron',
  bootsSteel = 'bootsSteel',
  bootsShadow = 'bootsShadow',
  beltLeather = 'beltLeather',
  beltGold = 'beltGold',
  beltRoyal = 'beltRoyal',
  ringRuby = 'ringRuby',
  ringSapphire = 'ringSapphire',
  ringAmethyst = 'ringAmethyst',
  ringTopaz = 'ringTopaz',
  necklaceRuby = 'necklaceRuby',
  necklaceGold = 'necklaceGold',
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
  [EquipableIds.swordSteel]: { id: 'swordSteel', type: PlayerItemType.weapon, name: 'Steel Sword', iconXY: { x: 0, y: 0 }, bonusStats: { attack: 2, damage: 2 } },
  [EquipableIds.swordLegendary]: { id: 'swordLegendary', type: PlayerItemType.weapon, name: 'Legendary Sword', iconXY: { x: 0, y: 0 }, bonusStats: { attack: 4, damage: 4 } },
  [EquipableIds.swordArcane]: { id: 'swordArcane', type: PlayerItemType.weapon, name: 'Arcane Sword', iconXY: { x: 1, y: 0 }, bonusStats: { attack: 2, damage: 2, magic: 2 } },
  [EquipableIds.swordInferno]: { id: 'swordInferno', type: PlayerItemType.weapon, name: 'Inferno Sword', iconXY: { x: 2, y: 0 }, bonusStats: { attack: 3, damage: 3, magic: 3 } },
  [EquipableIds.axeHand]: { id: 'axeHand', type: PlayerItemType.weapon, name: 'Hand Axe', iconXY: { x: 3, y: 0 }, bonusStats: { attack: 2, damage: 2 } },
  [EquipableIds.axeBattle]: { id: 'axeBattle', type: PlayerItemType.weapon, name: 'Battle Axe', iconXY: { x: 4, y: 0 }, bonusStats: { attack: 3, damage: 4 } },
  [EquipableIds.axeWar]: { id: 'axeWar', type: PlayerItemType.weapon, name: 'War Axe', iconXY: { x: 4, y: 0 }, bonusStats: { attack: 5, damage: 6 } },
  [EquipableIds.hammer]: { id: 'hammer', type: PlayerItemType.weapon, name: 'War Hammer', iconXY: { x: 3, y: 0 }, bonusStats: { attack: 2, damage: 4 } },
  [EquipableIds.warhammer]: { id: 'warhammer', type: PlayerItemType.weapon, name: 'Great Hammer', iconXY: { x: 4, y: 0 }, bonusStats: { attack: 4, damage: 6, speed: -1 } },
  [EquipableIds.dagger]: { id: 'dagger', type: PlayerItemType.weapon, name: 'Iron Dagger', iconXY: { x: 5, y: 0 }, bonusStats: { attack: 2, damage: 1, speed: 1 } },
  [EquipableIds.daggerVenom]: { id: 'daggerVenom', type: PlayerItemType.weapon, name: 'Venom Dagger', iconXY: { x: 5, y: 0 }, bonusStats: { attack: 4, damage: 2, speed: 2 } },
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
  [EquipableIds.bowLong]: { id: 'bowLong', type: PlayerItemType.weapon, name: 'Long Bow', ranged: true, iconXY: { x: 6, y: 0 }, bonusStats: { attack: 2, damage: 3, speed: 1 } },
  [EquipableIds.bowElven]: { id: 'bowElven', type: PlayerItemType.weapon, name: 'Elven Bow', ranged: true, iconXY: { x: 6, y: 0 }, bonusStats: { attack: 4, damage: 4, speed: 2 } },
  [EquipableIds.crossbow]: { id: 'crossbow', type: PlayerItemType.weapon, name: 'Heavy Crossbow', ranged: true, iconXY: { x: 7, y: 0 }, bonusStats: { attack: 5, damage: 6, speed: -1 } },
  [EquipableIds.staffSkull]: {
    id: EquipableIds.staffSkull.toString(),
    type: PlayerItemType.weapon,
    name: 'Skull Staff',
    iconXY: { x: 4, y: 1 },
    staff: true,
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
    staff: true,
    bonusStats: {
      magic: 1,
      health: 1,
    }
  },
  [EquipableIds.staffRuby]: { id: 'staffRuby', type: PlayerItemType.weapon, name: 'Ruby Staff', iconXY: { x: 2, y: 1 }, staff: true, bonusStats: { magic: 3, damage: 2 } },
  [EquipableIds.staffCrystal]: { id: 'staffCrystal', type: PlayerItemType.weapon, name: 'Crystal Staff', iconXY: { x: 5, y: 1 }, staff: true, bonusStats: { magic: 5, damage: 3, health: 2 } },
  [EquipableIds.shieldWooden]: { id: 'shieldWooden', type: PlayerItemType.armour, name: 'Wooden Shield', iconXY: { x: 0, y: 2 }, bonusStats: { defence: 1 } },
  [EquipableIds.shieldLion]: { id: 'shieldLion', type: PlayerItemType.armour, name: 'Lion Shield', iconXY: { x: 1, y: 2 }, bonusStats: { defence: 3, health: 1 } },
  [EquipableIds.shieldKnight]: { id: 'shieldKnight', type: PlayerItemType.armour, name: 'Knight Shield', iconXY: { x: 2, y: 2 }, bonusStats: { defence: 5, health: 2 } },
  [EquipableIds.shieldDemon]: { id: 'shieldDemon', type: PlayerItemType.armour, name: 'Demon Shield', iconXY: { x: 8, y: 2 }, bonusStats: { defence: 7, magic: 2, health: 3 } },
  [EquipableIds.armourLeather]: { id: 'armourLeather', type: PlayerItemType.armour, name: 'Leather Armour', iconXY: { x: 0, y: 3 }, bonusStats: { defence: 1, speed: 1 } },
  [EquipableIds.armourStudded]: { id: 'armourStudded', type: PlayerItemType.armour, name: 'Studded Armour', iconXY: { x: 1, y: 3 }, bonusStats: { defence: 2, health: 1 } },
  [EquipableIds.armourChain]: { id: 'armourChain', type: PlayerItemType.armour, name: 'Chainmail Armour', iconXY: { x: 3, y: 3 }, bonusStats: { defence: 4, health: 2, speed: -1 } },
  [EquipableIds.armourPlate]: { id: 'armourPlate', type: PlayerItemType.armour, name: 'Plate Armour', iconXY: { x: 5, y: 3 }, bonusStats: { defence: 7, health: 4, speed: -2 } },
  [EquipableIds.armourShadow]: { id: 'armourShadow', type: PlayerItemType.armour, name: 'Shadow Armour', iconXY: { x: 7, y: 3 }, bonusStats: { defence: 5, magic: 3, speed: 2 } },
  [EquipableIds.helmetLeather]: { id: 'helmetLeather', type: PlayerItemType.helmet, name: 'Leather Hood', iconXY: { x: 0, y: 4 }, bonusStats: { defence: 1 } },
  [EquipableIds.helmetIron]: { id: 'helmetIron', type: PlayerItemType.helmet, name: 'Iron Helmet', iconXY: { x: 2, y: 4 }, bonusStats: { defence: 3, health: 1 } },
  [EquipableIds.helmetHorned]: { id: 'helmetHorned', type: PlayerItemType.helmet, name: 'Horned Helmet', iconXY: { x: 4, y: 4 }, bonusStats: { attack: 1, defence: 4, health: 1 } },
  [EquipableIds.helmetRoyal]: { id: 'helmetRoyal', type: PlayerItemType.helmet, name: 'Royal Helmet', iconXY: { x: 8, y: 4 }, bonusStats: { defence: 5, magic: 2, health: 2 } },
  [EquipableIds.glovesLeather]: { id: 'glovesLeather', type: PlayerItemType.gloves, name: 'Leather Gloves', iconXY: { x: 0, y: 5 }, bonusStats: { attack: 1 } },
  [EquipableIds.glovesStudded]: { id: 'glovesStudded', type: PlayerItemType.gloves, name: 'Studded Gloves', iconXY: { x: 1, y: 5 }, bonusStats: { attack: 2, defence: 1 } },
  [EquipableIds.glovesIron]: { id: 'glovesIron', type: PlayerItemType.gloves, name: 'Iron Gauntlets', iconXY: { x: 3, y: 5 }, bonusStats: { attack: 3, defence: 3, speed: -1 } },
  [EquipableIds.glovesEnchanted]: { id: 'glovesEnchanted', type: PlayerItemType.gloves, name: 'Enchanted Gloves', iconXY: { x: 8, y: 5 }, bonusStats: { attack: 2, magic: 4, speed: 1 } },
  [EquipableIds.bootsLeather]: { id: 'bootsLeather', type: PlayerItemType.boots, name: 'Leather Boots', iconXY: { x: 0, y: 6 }, bonusStats: { speed: 1 } },
  [EquipableIds.bootsIron]: { id: 'bootsIron', type: PlayerItemType.boots, name: 'Iron Boots', iconXY: { x: 2, y: 6 }, bonusStats: { defence: 2, speed: 1 } },
  [EquipableIds.bootsSteel]: { id: 'bootsSteel', type: PlayerItemType.boots, name: 'Steel Boots', iconXY: { x: 4, y: 6 }, bonusStats: { defence: 4, health: 1 } },
  [EquipableIds.bootsShadow]: { id: 'bootsShadow', type: PlayerItemType.boots, name: 'Shadow Boots', iconXY: { x: 5, y: 6 }, bonusStats: { defence: 2, speed: 3 } },
  [EquipableIds.beltLeather]: { id: 'beltLeather', type: PlayerItemType.belt, name: 'Leather Belt', iconXY: { x: 6, y: 6 }, bonusStats: { health: 1 } },
  [EquipableIds.beltGold]: { id: 'beltGold', type: PlayerItemType.belt, name: 'Golden Belt', iconXY: { x: 7, y: 6 }, bonusStats: { defence: 2, health: 2 } },
  [EquipableIds.beltRoyal]: { id: 'beltRoyal', type: PlayerItemType.belt, name: 'Royal Belt', iconXY: { x: 8, y: 6 }, bonusStats: { defence: 3, magic: 2, health: 3 } },
  [EquipableIds.ringRuby]: { id: 'ringRuby', type: PlayerItemType.ring, name: 'Ruby Ring', iconXY: { x: 6, y: 7 }, bonusStats: { attack: 2, damage: 1 } },
  [EquipableIds.ringSapphire]: { id: 'ringSapphire', type: PlayerItemType.ring, name: 'Sapphire Ring', iconXY: { x: 7, y: 7 }, bonusStats: { magic: 3, health: 1 } },
  [EquipableIds.ringAmethyst]: { id: 'ringAmethyst', type: PlayerItemType.ring, name: 'Amethyst Ring', iconXY: { x: 8, y: 7 }, bonusStats: { magic: 2, speed: 2 } },
  [EquipableIds.ringTopaz]: { id: 'ringTopaz', type: PlayerItemType.ring, name: 'Topaz Ring', iconXY: { x: 9, y: 7 }, bonusStats: { attack: 2, speed: 2 } },
  [EquipableIds.necklaceRuby]: { id: 'necklaceRuby', type: PlayerItemType.necklace, name: 'Ruby Necklace', iconXY: { x: 8, y: 7 }, bonusStats: { health: 4, magic: 1 } },
  [EquipableIds.necklaceGold]: { id: 'necklaceGold', type: PlayerItemType.necklace, name: 'Golden Necklace', iconXY: { x: 9, y: 7 }, bonusStats: { health: 3, defence: 2, magic: 2 } },
};

export enum ConsumableIds {
  healingPotion = 'healingPotion',
  greaterHealingPotion = 'greaterHealingPotion',
  manaPotion = 'manaPotion',
  swiftPotion = 'swiftPotion',
  elixir = 'elixir',
  resurrectionStone = 'resurrectionStore',
  resurrectionShard = 'resurrectionShard',
};

export const consumableItems: Record<ConsumableIds, PlayerConsumableItem> = {
  [ConsumableIds.healingPotion]: {
    id: ConsumableIds.healingPotion.toString(),
    type: PlayerItemType.consumable,
    name: 'Minor Healing Potion',
    iconXY: { x: 0, y: 7 },
    useCost: 5,
    iconScale: 0.7,
    bonusStats: {
      health: 5,
    }
  },
  [ConsumableIds.greaterHealingPotion]: { id: 'greaterHealingPotion', type: PlayerItemType.consumable, name: 'Greater Healing Potion', iconXY: { x: 0, y: 7 }, useCost: 5, bonusStats: { health: 12 } },
  [ConsumableIds.manaPotion]: { id: 'manaPotion', type: PlayerItemType.consumable, name: 'Mana Potion', iconXY: { x: 1, y: 7 }, useCost: 5, bonusStats: { magic: 5 } },
  [ConsumableIds.swiftPotion]: { id: 'swiftPotion', type: PlayerItemType.consumable, name: 'Swift Potion', iconXY: { x: 2, y: 7 }, useCost: 5,bonusStats: { speed: 3 } },
  [ConsumableIds.elixir]: { id: 'elixir', type: PlayerItemType.consumable, name: 'Mighty Elixir', iconXY: { x: 3, y: 7 }, useCost: 5, bonusStats: { health: 8, attack: 2, magic: 2 } },
  [ConsumableIds.resurrectionStone]: {
    id: ConsumableIds.resurrectionStone.toString(),
    type: PlayerItemType.consumable,
    name: 'Resurrection Stone',
    iconXY: { x: 9, y: 4 },
    useCost: 15,
    bonusStats: {
      special: 'Resurrects a dead player',
    },
  },
  [ConsumableIds.resurrectionShard]: {
    id: ConsumableIds.resurrectionShard.toString(),
    type: PlayerItemType.consumable,
    name: 'Cracked Resurrection Stone',
    iconXY: { x: 9, y: 4 },
    useCost: 15,
    bonusStats: {
      special: 'May resurrect a dead player',
    }
  },
};

export type ItemIds = EquipableIds | ConsumableIds;

export const allItems: Record<ItemIds, PlayerItem> = {
  ...equipableItems,
  ...consumableItems,
};

const excludeFromLoot: string[] = [
  ConsumableIds.resurrectionStone
];
export const lootItems: PlayerItem[] =
  Object.entries(allItems).map(([id, item]) => item)
    .filter(i => !excludeFromLoot.includes(i.id))
