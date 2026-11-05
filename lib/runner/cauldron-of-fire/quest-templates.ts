import { ConsumableIds, EquipableIds, ScrollIds, SpecialIds, allItems } from '@/lib/games/items';
import { getCellAtCoordinates, getCellCoordinates, MAP_COLUMNS, MAP_ROWS } from '@/lib/games/gridCells';
import { sharedLocations } from '@/lib/games/maps/shared-locations';
import { monsters } from '@/lib/games/monsters';
import { NPC_DATA } from '@/lib/games/npc-details';
import { QuestCategory, QuestInstance, QuestReward, QuestScope, QuestTier } from './quest-types';

export interface QuestTemplate {
  id: string;
  titleTemplate: string;
  descriptionTemplate: string;
  category: QuestCategory;
  tier: QuestTier;
  scope: QuestScope;
  offerLocations: number[];
  targetLocations?: number[];
  hintCount?: number;
  destinationLocations?: number[];
  itemPool?: SpecialIds[];
  monsterPool?: string[];
  bossNames?: string[];
  npcNames?: string[];
  areaName?: string;
}

const QUEST_ITEMS_ALL: SpecialIds[] = [
  SpecialIds.questRelicSkull,
  SpecialIds.questAlchemistBag,
  SpecialIds.questRoyalLedger,
  SpecialIds.questSunMedallion,
  SpecialIds.questMoonAmulet,
  SpecialIds.questGoldenCrest,
  SpecialIds.questSapphireScepter,
  SpecialIds.questEmeraldIdol,
  SpecialIds.questSacredChalice,
  SpecialIds.questDragonHorn,
];

const EARLY_REWARD_ITEMS: string[] = [
  ConsumableIds.greaterHealingPotion,
  ConsumableIds.manaPotion,
  ConsumableIds.swiftPotion,
  EquipableIds.swordSteel,
  EquipableIds.axeBattle,
  EquipableIds.bowLong,
  EquipableIds.staffSkull,
  EquipableIds.staffOrb,
  EquipableIds.shieldLion,
  EquipableIds.armourStudded,
  EquipableIds.helmetIron,
  EquipableIds.glovesStudded,
  EquipableIds.bootsIron,
  EquipableIds.beltGold,
  ScrollIds.heal,
  ScrollIds.fireBall,
  ScrollIds.iceShards,
  ScrollIds.rage,
  ScrollIds.focus,
];

const MID_REWARD_ITEMS: string[] = [
  ConsumableIds.toughPotion,
  ConsumableIds.focusPotion,
  ConsumableIds.elixir,
  EquipableIds.swordLegendary,
  EquipableIds.axeWar,
  EquipableIds.warhammer,
  EquipableIds.daggerVenom,
  EquipableIds.bowElven,
  EquipableIds.crossbow,
  EquipableIds.staffRuby,
  EquipableIds.shieldKnight,
  EquipableIds.armourChain,
  EquipableIds.helmetHorned,
  EquipableIds.glovesIron,
  EquipableIds.bootsSteel,
  EquipableIds.ringSapphire,
  EquipableIds.ringRuby,
  EquipableIds.necklaceRuby,
  ScrollIds.lightning,
  ScrollIds.healingAura,
  ScrollIds.shieldWall,
  ScrollIds.whirlwind,
  ScrollIds.multiShot,
];

const LATE_REWARD_ITEMS: string[] = [
  ConsumableIds.elixir,
  ConsumableIds.resurrectionShard,
  EquipableIds.swordArcane,
  EquipableIds.swordInferno,
  EquipableIds.staffCrystal,
  EquipableIds.shieldDemon,
  EquipableIds.armourPlate,
  EquipableIds.armourShadow,
  EquipableIds.helmetRoyal,
  EquipableIds.glovesEnchanted,
  EquipableIds.bootsShadow,
  EquipableIds.beltRoyal,
  EquipableIds.necklaceGold,
  ScrollIds.fireRain,
  ScrollIds.timeWarp,
  ScrollIds.berserker,
  ScrollIds.sniperShot,
];

export const QUEST_TEMPLATES: QuestTemplate[] = [
  // ==========================================
  // 1. RETRIEVE ITEM QUESTS (Example 1)
  // ==========================================
  {
    id: 'retrieve-sw-mine-relic',
    titleTemplate: 'The Lost {item} of the Mine',
    descriptionTemplate: 'Miners fled the southern caves in a panic and dropped the {item}. Search the caverns ({locations}) and bring it back to Location {offer}.',
    category: 'retrieve_item',
    tier: 'early',
    scope: 'player',
    offerLocations: [38, 4, 31],
    targetLocations: [1, 3, 35, 36, 37, 41, 44],
    hintCount: 3,
    itemPool: [SpecialIds.questRelicSkull, SpecialIds.questGoldenCrest, SpecialIds.questSunMedallion, SpecialIds.questSacredChalice],
  },
  {
    id: 'retrieve-se-village-heirloom',
    titleTemplate: 'Stolen Village {item}',
    descriptionTemplate: 'Thieves raided the market and hid the {item} in the sandy hills ({locations}). Recover it and return to Location {offer}.',
    category: 'retrieve_item',
    tier: 'early',
    scope: 'shared',
    offerLocations: [22, 23, 24],
    targetLocations: [16, 18, 19, 20, 61, 62],
    hintCount: 2,
    itemPool: [SpecialIds.questSunMedallion, SpecialIds.questRoyalLedger, SpecialIds.questMoonAmulet],
  },
  {
    id: 'retrieve-forest-idol',
    titleTemplate: 'The Hidden {item}',
    descriptionTemplate: 'A woodland shrine was desecrated. The {item} was carried into a forest glade ({locations}). Bring it back to Location {offer}.',
    category: 'retrieve_item',
    tier: 'early',
    scope: 'player',
    offerLocations: [10, 30, 34, 49],
    targetLocations: [7, 13, 47, 48, 50, 53],
    hintCount: 2,
    itemPool: [SpecialIds.questEmeraldIdol, SpecialIds.questMoonAmulet],
  },
  {
    id: 'retrieve-healer-satchel',
    titleTemplate: 'The Healer\'s {item}',
    descriptionTemplate: 'The village healer lost a {item} while gathering herbs near the desert edge ({locations}). Retrieve it and return to Location {offer}.',
    category: 'retrieve_item',
    tier: 'early',
    scope: 'player',
    offerLocations: [22, 57, 60],
    targetLocations: [60, 61, 63, 64, 67],
    hintCount: 2,
    itemPool: [SpecialIds.questAlchemistBag],
  },
  {
    id: 'retrieve-witch-artifact',
    titleTemplate: 'The Witch\'s {item}',
    descriptionTemplate: 'The witch of the western woods needs her {item} recovered from the deep underground halls ({locations}). Return it to Location {offer}.',
    category: 'retrieve_item',
    tier: 'mid',
    scope: 'shared',
    offerLocations: [80, 79, 77],
    targetLocations: [73, 74, 76, 85, 87, 116, 117, 120],
    hintCount: 3,
    itemPool: [SpecialIds.questRelicSkull, SpecialIds.questMoonAmulet, SpecialIds.questSapphireScepter],
  },
  {
    id: 'retrieve-blacksmith-crest',
    titleTemplate: 'Forgemaster\'s {item}',
    descriptionTemplate: 'Goblins stole the blacksmith\'s {item} and fled into the western caves ({locations}). Recover it and bring it back to Location {offer}.',
    category: 'retrieve_item',
    tier: 'mid',
    scope: 'player',
    offerLocations: [90, 91, 89],
    targetLocations: [73, 75, 82, 85, 87, 116],
    hintCount: 2,
    itemPool: [SpecialIds.questGoldenCrest, SpecialIds.questSunMedallion],
  },
  {
    id: 'retrieve-tavern-ledger',
    titleTemplate: 'The Innkeeper\'s {item}',
    descriptionTemplate: 'Bandits ambushed a courier in the woods and took the {item} ({locations}). Return it to the tavern at Location {offer}.',
    category: 'retrieve_item',
    tier: 'mid',
    scope: 'player',
    offerLocations: [110, 58, 121],
    targetLocations: [69, 70, 106, 111, 112, 113],
    hintCount: 3,
    itemPool: [SpecialIds.questRoyalLedger, SpecialIds.questAlchemistBag],
  },
  {
    id: 'retrieve-desert-scepter',
    titleTemplate: 'Relic of the Shifting Sands: {item}',
    descriptionTemplate: 'Nomads speak of a {item} buried in the eastern desert caverns ({locations}). Recover it and bring it back to Location {offer}.',
    category: 'retrieve_item',
    tier: 'mid',
    scope: 'shared',
    offerLocations: [96, 98, 102, 64],
    targetLocations: [101, 136, 138, 140, 141, 143],
    hintCount: 3,
    itemPool: [SpecialIds.questSapphireScepter, SpecialIds.questSunMedallion, SpecialIds.questGoldenCrest],
  },
  {
    id: 'retrieve-prosperous-treasure',
    titleTemplate: 'The Merchant\'s {item}',
    descriptionTemplate: 'A wealthy merchant in the northern village had their {item} dragged into the damp underground chambers ({locations}). Return it to Location {offer}.',
    category: 'retrieve_item',
    tier: 'mid',
    scope: 'player',
    offerLocations: [118, 119, 123],
    targetLocations: [116, 117, 120, 73, 87],
    hintCount: 2,
    itemPool: [SpecialIds.questRoyalLedger, SpecialIds.questGoldenCrest, SpecialIds.questSapphireScepter],
  },
  {
    id: 'retrieve-volcano-relic',
    titleTemplate: 'Heart of the Mountain: {item}',
    descriptionTemplate: 'An expedition into the volcano tunnels lost the {item} ({locations}). Brave the heat and return it to Location {offer}.',
    category: 'retrieve_item',
    tier: 'late',
    scope: 'shared',
    offerLocations: [153, 154, 165, 197],
    targetLocations: [156, 160, 192, 198, 200, 205, 206, 232, 236],
    hintCount: 3,
    itemPool: [SpecialIds.questRelicSkull, SpecialIds.questSunMedallion, SpecialIds.questSapphireScepter, SpecialIds.questDragonHorn],
  },
  {
    id: 'retrieve-castle-heirloom',
    titleTemplate: 'Plundered Royal {item}',
    descriptionTemplate: 'A scout outside the castle walls begs you to recover the {item} from the castle rooms ({locations}) and return it to Location {offer}.',
    category: 'retrieve_item',
    tier: 'late',
    scope: 'shared',
    offerLocations: [181, 184, 211, 229],
    targetLocations: [214, 216, 220, 221, 223, 226, 227],
    hintCount: 3,
    itemPool: [SpecialIds.questRoyalLedger, SpecialIds.questGoldenCrest, SpecialIds.questSapphireScepter],
  },

  // ==========================================
  // 2. DELIVER ITEM QUESTS (Courier Variant)
  // ==========================================
  {
    id: 'deliver-gate-to-se-village',
    titleTemplate: 'Urgent Dispatch: {item}',
    descriptionTemplate: 'Carry this {item} from Location {offer} and deliver it safely to the village square at Location {destination}.',
    category: 'deliver_item',
    tier: 'early',
    scope: 'player',
    offerLocations: [10, 31, 28],
    destinationLocations: [22, 23, 58],
    itemPool: [SpecialIds.questRoyalLedger, SpecialIds.questAlchemistBag],
  },
  {
    id: 'deliver-se-to-central-village',
    titleTemplate: 'Trade Caravan {item}',
    descriptionTemplate: 'Deliver the merchant\'s {item} from Location {offer} to the central village at Location {destination}.',
    category: 'deliver_item',
    tier: 'early',
    scope: 'player',
    offerLocations: [21, 23, 57],
    destinationLocations: [90, 91, 110],
    itemPool: [SpecialIds.questRoyalLedger, SpecialIds.questGoldenCrest, SpecialIds.questAlchemistBag],
  },
  {
    id: 'deliver-witch-potion-bag',
    titleTemplate: 'The Witch\'s Delivery: {item}',
    descriptionTemplate: 'Take this {item} from Location {offer} and deliver it to the northern village store at Location {destination}.',
    category: 'deliver_item',
    tier: 'mid',
    scope: 'player',
    offerLocations: [80, 78, 91],
    destinationLocations: [118, 119, 121, 123],
    itemPool: [SpecialIds.questAlchemistBag, SpecialIds.questMoonAmulet],
  },
  {
    id: 'deliver-blacksmith-shipment',
    titleTemplate: 'Outpost Supply: {item}',
    descriptionTemplate: 'Carry the {item} from Location {offer} to the northern mountain camp at Location {destination}.',
    category: 'deliver_item',
    tier: 'mid',
    scope: 'shared',
    offerLocations: [90, 118, 123],
    destinationLocations: [153, 154, 184, 211],
    itemPool: [SpecialIds.questGoldenCrest, SpecialIds.questSunMedallion],
  },
  {
    id: 'deliver-farm-provisions',
    titleTemplate: 'Farm Provisions: {item}',
    descriptionTemplate: 'The farm workers need this {item} delivered from Location {offer} to the tavern at Location {destination}.',
    category: 'deliver_item',
    tier: 'early',
    scope: 'player',
    offerLocations: [65, 67],
    destinationLocations: [58, 110, 22],
    itemPool: [SpecialIds.questAlchemistBag, SpecialIds.questEmeraldIdol],
  },
  {
    id: 'deliver-secret-scroll',
    titleTemplate: 'Rebel War Plans: {item}',
    descriptionTemplate: 'Deliver the {item} from Location {offer} to the hidden rebel outpost in the northern copse at Location {destination}.',
    category: 'deliver_item',
    tier: 'late',
    scope: 'shared',
    offerLocations: [119, 121, 135],
    destinationLocations: [229, 181, 184],
    itemPool: [SpecialIds.questRoyalLedger, SpecialIds.questSapphireScepter],
  },

  // ==========================================
  // 3. ESCORT NPC QUESTS (Example 2)
  // ==========================================
  {
    id: 'escort-pilgrim-to-village',
    titleTemplate: 'Escort {npc} to Safety',
    descriptionTemplate: '{npc} is stranded at Location {offer} and needs an escort to the village at Location {destination}. Keep {npc} alive until you arrive!',
    category: 'escort_npc',
    tier: 'early',
    scope: 'player',
    offerLocations: [10, 31, 34, 28, 38],
    destinationLocations: [23, 91],
    npcNames: ['Brother Aldous', 'Sister Clara', 'Old Miller Tom', 'Young Pip', 'Merchant Milo'],
  },
  {
    id: 'escort-apprentice-to-witch',
    titleTemplate: 'Escort Apprentice {npc}',
    descriptionTemplate: '{npc} must reach the Witch\'s Hut at Location {destination} from Location {offer}, but the roads are crawling with monsters.',
    category: 'escort_npc',
    tier: 'early',
    scope: 'player',
    offerLocations: [23, 58, 91],
    destinationLocations: [80],
    npcNames: ['Apprentice Lyra', 'Novice Finn', 'Herbalist Mira', 'Scholar Bramble'],
  },
  {
    id: 'escort-merchant-to-north-village',
    titleTemplate: 'Guard Trader {npc}',
    descriptionTemplate: 'Trader {npc} is carrying valuable wares from Location {offer} to the prosperous village at Location {destination}. Protect them on the journey!',
    category: 'escort_npc',
    tier: 'mid',
    scope: 'shared',
    offerLocations: [22, 58, 90, 91, 110],
    destinationLocations: [118, 119, 121],
    npcNames: ['Master Corin', 'Lady Evelina', 'Jeweler Garrik', 'Silversmith Tessa'],
  },
  {
    id: 'escort-farmer-home',
    titleTemplate: 'Bring {npc} Back to the Farm',
    descriptionTemplate: '{npc} fled from monsters and is hiding at Location {offer}. Escort them safely home to the farm at Location {destination}.',
    category: 'escort_npc',
    tier: 'early',
    scope: 'player',
    offerLocations: [25, 55, 64, 95],
    destinationLocations: [67],
    npcNames: ['Farmer Giles', 'Shepherdess Martha', 'Herdsman Hob', 'Bailiff Rowan'],
  },
  {
    id: 'escort-envoy-to-castle-gate',
    titleTemplate: 'The Royal Envoy: {npc}',
    descriptionTemplate: 'Escort {npc} from Location {offer} to the Castle Gates at Location {destination} so they can sound the horn of challenge.',
    category: 'escort_npc',
    tier: 'late',
    scope: 'shared',
    offerLocations: [110, 119, 135, 154],
    destinationLocations: [184],
    npcNames: ['Herald Valerius', 'Sir Roland the Wounded', 'Chronicler Osric', 'Envoy Seraphina'],
  },
  {
    id: 'escort-prospector-to-camp',
    titleTemplate: 'Guide Prospector {npc}',
    descriptionTemplate: 'Prospector {npc} at Location {offer} wants to reach the northern mountain camp at Location {destination}. Keep them safe!',
    category: 'escort_npc',
    tier: 'mid',
    scope: 'player',
    offerLocations: [91, 118, 122],
    destinationLocations: [153, 151],
    npcNames: ['Prospector Durn', 'Geologist Elira', 'Cartographer Venn', 'Miner Torbin'],
  },
  {
    id: 'escort-woodsman-to-tavern',
    titleTemplate: 'Wounded Woodsman {npc}',
    descriptionTemplate: '{npc} was injured in the forest at Location {offer}. Escort them to the warm tavern at Location {destination}.',
    category: 'escort_npc',
    tier: 'early',
    scope: 'player',
    offerLocations: [46, 51, 68, 71, 72],
    destinationLocations: [110, 58],
    npcNames: ['Woodsman Harlan', 'Forester Jetta', 'Trapper Bram', 'Scout Kaelen'],
  },

  // ==========================================
  // 4. RESCUE NPC QUESTS (Dungeon Rescue Variant)
  // ==========================================
  {
    id: 'rescue-miner-sw-caves',
    titleTemplate: 'Rescue Trapped Miner {npc}',
    descriptionTemplate: '{npc} was trapped when monsters overran the southern mine ({locations}). Find {npc} and escort them safely back to Location {destination}!',
    category: 'rescue_npc',
    tier: 'early',
    scope: 'shared',
    offerLocations: [38, 4, 6],
    targetLocations: [1, 2, 3, 35, 36, 37, 41, 44],
    hintCount: 3,
    destinationLocations: [38],
    npcNames: ['Foreman Duggan', 'Miner Greta', 'Delver Brom', 'Sapper Penn'],
  },
  {
    id: 'rescue-villager-west-caves',
    titleTemplate: 'Save Captive {npc}',
    descriptionTemplate: 'Monsters dragged {npc} into the western underground caverns ({locations}). Find them and bring them back alive to Location {destination}!',
    category: 'rescue_npc',
    tier: 'mid',
    scope: 'shared',
    offerLocations: [77, 78, 91, 118],
    targetLocations: [73, 74, 76, 85, 87, 116, 117, 120],
    hintCount: 3,
    destinationLocations: [91, 118],
    npcNames: ['Blacksmith\'s Son Leo', 'Innkeeper\'s Daughter Rose', 'Elder Elspeth', 'Bard Taliesin'],
  },
  {
    id: 'rescue-explorer-east-caves',
    titleTemplate: 'Lost Explorer {npc}',
    descriptionTemplate: 'Explorer {npc} vanished inside the eastern desert caves ({locations}). Rescue {npc} and bring them back to Location {destination}.',
    category: 'rescue_npc',
    tier: 'mid',
    scope: 'player',
    offerLocations: [102, 98, 135],
    targetLocations: [101, 136, 138, 140, 141, 143],
    hintCount: 2,
    destinationLocations: [102, 91],
    npcNames: ['Explorer Vance', 'Antiquarian Sola', 'Pathfinder Dax', 'Chronicler Mina'],
  },
  {
    id: 'rescue-scout-forest',
    titleTemplate: 'Missing Ranger {npc}',
    descriptionTemplate: '{npc} went missing deep in the forest clearings ({locations}). Find {npc} and guide them back to Location {destination}.',
    category: 'rescue_npc',
    tier: 'early',
    scope: 'player',
    offerLocations: [31, 49, 90],
    targetLocations: [50, 52, 53, 69, 70, 111, 113],
    hintCount: 2,
    destinationLocations: [91, 31],
    npcNames: ['Watcher Elowen', 'Scout Talan', 'Tracker Orin', 'Outrider Fae'],
  },
  {
    id: 'rescue-prisoner-volcano',
    titleTemplate: 'Prisoner of the Mountain: {npc}',
    descriptionTemplate: '{npc} is held captive in the volcanic mountain chambers ({locations}). Rescue them and bring them safely to Location {destination}!',
    category: 'rescue_npc',
    tier: 'late',
    scope: 'shared',
    offerLocations: [153, 165, 197, 211],
    targetLocations: [156, 160, 192, 200, 205, 206, 232, 236],
    hintCount: 3,
    destinationLocations: [153, 119],
    npcNames: ['Sir Galahad', 'Archmage Caelum', 'Captain Valeria', 'High Priestess Nyssa'],
  },

  // ==========================================
  // 5. CLEAR DUNGEON / AREA QUESTS (Example 3a)
  // ==========================================
  {
    id: 'clear-sw-mine-upper',
    titleTemplate: 'Clear the Upper Mine Tunnels',
    descriptionTemplate: 'Scared miners at Location {offer} beg you to wipe out all monsters in the upper mine caves (Locations {locations}). Reward is issued immediately!',
    category: 'clear_dungeon',
    tier: 'early',
    scope: 'shared',
    offerLocations: [38, 4, 5],
    targetLocations: [35, 36, 37, 43, 44],
    areaName: 'Upper Mine Caves',
  },
  {
    id: 'clear-sw-mine-deep',
    titleTemplate: 'Purge the Deep Western Cavern',
    descriptionTemplate: 'Monsters have nested in the deep southern cavern (Locations {locations}). Clear every monster there to make the camp safe!',
    category: 'clear_dungeon',
    tier: 'early',
    scope: 'shared',
    offerLocations: [38, 34, 6],
    targetLocations: [1, 2, 3, 39, 40, 41, 42],
    areaName: 'Deep Southern Cavern',
  },
  {
    id: 'clear-sandy-hills',
    titleTemplate: 'Drive Monsters from the Sandy Hills',
    descriptionTemplate: 'Villagers at Location {offer} are terrified of creatures lurking in the sandy hills (Locations {locations}). Eliminate all monsters in those hills!',
    category: 'clear_dungeon',
    tier: 'early',
    scope: 'shared',
    offerLocations: [21, 22, 23, 17],
    targetLocations: [18, 19, 20],
    areaName: 'Sandy Hills',
  },
  {
    id: 'clear-desert-outskirts',
    titleTemplate: 'Secure the Desert Trails',
    descriptionTemplate: 'Clear the monster packs prowling the trails behind the village (Locations {locations}) so travellers can pass safely.',
    category: 'clear_dungeon',
    tier: 'early',
    scope: 'player',
    offerLocations: [24, 57, 58, 59],
    targetLocations: [60, 61, 62, 63],
    areaName: 'Desert Edge Trails',
  },
  {
    id: 'clear-central-woods',
    titleTemplate: 'Cleanse the Deep Woods',
    descriptionTemplate: 'Beasts in the deep woods (Locations {locations}) have been attacking woodcutters. Slay all monsters in those clearings!',
    category: 'clear_dungeon',
    tier: 'mid',
    scope: 'shared',
    offerLocations: [68, 71, 72, 90],
    targetLocations: [50, 51, 69, 70],
    areaName: 'Central Deep Woods',
  },
  {
    id: 'clear-tavern-woods',
    titleTemplate: 'Clear the Sheltered Clearings',
    descriptionTemplate: 'Patrons at the tavern report monsters massing in the clearings behind the village (Locations {locations}). Wipe them out!',
    category: 'clear_dungeon',
    tier: 'mid',
    scope: 'player',
    offerLocations: [91, 109, 110, 131],
    targetLocations: [111, 112, 113],
    areaName: 'Village Woods Clearings',
  },
  {
    id: 'clear-west-caves-east-wing',
    titleTemplate: 'Clear the Underground Crossroads',
    descriptionTemplate: 'Clear all monsters out of the eastern wing of the underground tunnels (Locations {locations}).',
    category: 'clear_dungeon',
    tier: 'mid',
    scope: 'shared',
    offerLocations: [77, 78, 79, 80],
    targetLocations: [73, 74, 75, 76, 86, 87],
    areaName: 'Eastern Underground Halls',
  },
  {
    id: 'clear-west-caves-west-wing',
    titleTemplate: 'Purge the Damp Caverns',
    descriptionTemplate: 'Villagers hear terrible sounds from the caverns beneath their homes (Locations {locations}). Slay every monster lurking there!',
    category: 'clear_dungeon',
    tier: 'mid',
    scope: 'shared',
    offerLocations: [118, 119, 122, 123],
    targetLocations: [81, 82, 84, 85, 116, 117, 120],
    areaName: 'Western Damp Caverns',
  },
  {
    id: 'clear-east-desert-caves',
    titleTemplate: 'Exterminate the Desert Cavern Lair',
    descriptionTemplate: 'A monster brood has infested the eastern underground caverns (Locations {locations}). Clear all monsters in the cavern!',
    category: 'clear_dungeon',
    tier: 'mid',
    scope: 'shared',
    offerLocations: [102, 103, 135, 144],
    targetLocations: [101, 136, 137, 138, 139, 140, 141, 142, 143],
    areaName: 'Eastern Desert Caverns',
  },
  {
    id: 'clear-northern-forest',
    titleTemplate: 'Sweep the Castle Forest',
    descriptionTemplate: 'Monsters in the northern forest (Locations {locations}) ambush anyone approaching the castle. Clear the forest trails!',
    category: 'clear_dungeon',
    tier: 'late',
    scope: 'shared',
    offerLocations: [173, 174, 175, 177],
    targetLocations: [178, 179, 180],
    areaName: 'Northern Forest',
  },
  {
    id: 'clear-mountain-mouth',
    titleTemplate: 'Clear the Mountain Cave Tunnels',
    descriptionTemplate: 'Clear out the monsters entrenched in the eastern mountain tunnels (Locations {locations}).',
    category: 'clear_dungeon',
    tier: 'late',
    scope: 'shared',
    offerLocations: [153, 169, 170, 190],
    targetLocations: [166, 167, 168, 192, 193],
    areaName: 'Eastern Mountain Tunnels',
  },

  // ==========================================
  // 6. SLAY BOSS MONSTER QUESTS (Example 3b)
  // ==========================================
  {
    id: 'boss-forest-spider',
    titleTemplate: 'Slay {boss} the Giant Spider',
    descriptionTemplate: 'A monstrous spider known as {boss} is terrorizing travelers from its web near Locations {locations}. Slay {boss} for an immediate bounty!',
    category: 'slay_boss',
    tier: 'early',
    scope: 'player',
    offerLocations: [10, 12, 14, 28, 31],
    targetLocations: [7, 13, 30, 47, 53],
    hintCount: 2,
    monsterPool: ['spider', 'snake', 'goblin'],
    bossNames: ['Widowmaker', 'Venomfang', 'Skittermaw', 'Shadowspinner'],
  },
  {
    id: 'boss-hills-wyvern',
    titleTemplate: 'Hunt {boss} of the Crags',
    descriptionTemplate: 'The fierce beast {boss} has been swooping down on the village from the rocky hills ({locations}). Track it down and slay it!',
    category: 'slay_boss',
    tier: 'early',
    scope: 'shared',
    offerLocations: [15, 23, 25, 27],
    targetLocations: [16, 20, 26, 61],
    hintCount: 2,
    monsterPool: ['wyvern', 'scorpion', 'wildcat'],
    bossNames: ['Screechwing', 'Cragclaw', 'Dune Stalker', 'Sandstinger'],
  },
  {
    id: 'boss-farm-raider',
    titleTemplate: 'Defeat Raider Chief {boss}',
    descriptionTemplate: '{boss} has been raiding the farmlands from a hideout near Locations {locations}. Put an end to the menace!',
    category: 'slay_boss',
    tier: 'early',
    scope: 'player',
    offerLocations: [55, 64, 65, 67, 94],
    targetLocations: [66, 97, 100, 106],
    hintCount: 2,
    monsterPool: ['orc', 'bandit', 'wildcat'],
    bossNames: ['Grimscar', 'Bloodtooth', 'Redblade', 'Gorgutz'],
  },
  {
    id: 'boss-mine-troll',
    titleTemplate: 'Slay {boss} in the Mine',
    descriptionTemplate: 'A hulking brute named {boss} has claimed the southern mine caves ({locations}). Defeat {boss} to claim the bounty!',
    category: 'slay_boss',
    tier: 'early',
    scope: 'shared',
    offerLocations: [38, 34, 45],
    targetLocations: [1, 3, 35, 37, 41],
    hintCount: 2,
    monsterPool: ['orc', 'troll', 'ghoul'],
    bossNames: ['Stonecrusher', 'Grimjaw', 'Marrowgnaw', 'Bonebreaker'],
  },
  {
    id: 'boss-woods-hydra',
    titleTemplate: 'Beast of the Woods: {boss}',
    descriptionTemplate: 'Hunters at Location {offer} offer a rich reward to anyone who slays {boss}, last spotted in the forest clearings ({locations}).',
    category: 'slay_boss',
    tier: 'mid',
    scope: 'shared',
    offerLocations: [71, 88, 90, 91, 110],
    targetLocations: [50, 69, 70, 111, 113],
    hintCount: 2,
    monsterPool: ['hydra', 'troll', 'ogre'],
    bossNames: ['Scalebane', 'Thornback', 'Blightmaw', 'Gloomstalker'],
  },
  {
    id: 'boss-west-cave-fiend',
    titleTemplate: 'Abyssal Terror: {boss}',
    descriptionTemplate: 'A terrifying creature called {boss} lurks in the western underground chambers ({locations}). Destroy it!',
    category: 'slay_boss',
    tier: 'mid',
    scope: 'shared',
    offerLocations: [78, 80, 118, 121],
    targetLocations: [73, 76, 85, 116, 120],
    hintCount: 2,
    monsterPool: ['oculusfiend', 'minotaur', 'ogre', 'squizard'],
    bossNames: ['Vorgath the All-Seeing', 'Dreadhorn', 'Gloomweaver', 'Malakor\'s Bane'],
  },
  {
    id: 'boss-desert-warlord',
    titleTemplate: 'Bounty: {boss} of the Wastes',
    descriptionTemplate: '{boss} rules the eastern desert and caverns ({locations}). Slay the warlord to earn a massive reward!',
    category: 'slay_boss',
    tier: 'mid',
    scope: 'shared',
    offerLocations: [95, 96, 98, 102, 135],
    targetLocations: [97, 100, 101, 136, 138],
    hintCount: 3,
    monsterPool: ['cyclops', 'rocktroll', 'minotaur'],
    bossNames: ['One-Eyed Gorgor', 'Sandbreaker', 'Ironhide', 'Krag the Unyielding'],
  },
  {
    id: 'boss-mountain-colossus',
    titleTemplate: 'Slay the Mountain Tyrant {boss}',
    descriptionTemplate: '{boss} guards the northern mountain passes and caverns ({locations}). Defeat this colossus!',
    category: 'slay_boss',
    tier: 'late',
    scope: 'shared',
    offerLocations: [149, 153, 154, 165, 191],
    targetLocations: [151, 152, 156, 160, 171, 192, 200],
    hintCount: 3,
    monsterPool: ['rocktroll', 'cyclops', 'minotaur', 'oculusfiend'],
    bossNames: ['Obsidian Fist', 'Magmaheart', 'Doomhorn', 'Cinderlord'],
  },
  {
    id: 'boss-castle-warden',
    titleTemplate: 'Vanquish {boss}, Warden of the Wall',
    descriptionTemplate: 'The Lich King\'s lieutenant {boss} patrols the castle approaches and secret tunnels ({locations}). Destroy them!',
    category: 'slay_boss',
    tier: 'late',
    scope: 'shared',
    offerLocations: [175, 181, 184, 211, 229],
    targetLocations: [180, 186, 212, 213, 228],
    hintCount: 2,
    monsterPool: ['minotaur', 'skeletaldragon', 'squizard', 'oculusfiend'],
    bossNames: ['Dread Warden Vane', 'Bonewing', 'Hexmaster Zull', 'Soulreaver'],
  },

  // ==========================================
  // 7. SCOUT / RECONNOITER QUESTS (Exploration Variant)
  // ==========================================
  {
    id: 'scout-southern-outposts',
    titleTemplate: 'Scout the Southern Frontier',
    descriptionTemplate: 'The gate watch at Location {offer} needs a scout to inspect the frontier landmarks at Locations {locations}. Visit each location!',
    category: 'scout_area',
    tier: 'early',
    scope: 'player',
    offerLocations: [10, 31, 34],
    targetLocations: [7, 16, 38],
    areaName: 'Southern Frontier Landmarks',
  },
  {
    id: 'scout-desert-watchpoints',
    titleTemplate: 'Chart the Desert Outposts',
    descriptionTemplate: 'Reconnoiter the desert lookout points at Locations {locations} so the village can track monster movements.',
    category: 'scout_area',
    tier: 'mid',
    scope: 'player',
    offerLocations: [23, 64, 95, 98],
    targetLocations: [20, 97, 100],
    areaName: 'Desert Lookouts',
  },
  {
    id: 'scout-mountain-approaches',
    titleTemplate: 'Reconnoiter the Northern Peaks',
    descriptionTemplate: 'Scout the dangerous mountain approaches at Locations {locations} to map a safe route for the heroes.',
    category: 'scout_area',
    tier: 'late',
    scope: 'shared',
    offerLocations: [119, 135, 154, 173],
    targetLocations: [151, 171, 197],
    areaName: 'Northern Mountain Approaches',
  },
  {
    id: 'scout-castle-perimeter',
    titleTemplate: 'Survey the Castle Defences',
    descriptionTemplate: 'Inspect the castle walls and secret approaches at Locations {locations} to uncover weak points in the Lich King\'s defences.',
    category: 'scout_area',
    tier: 'late',
    scope: 'shared',
    offerLocations: [175, 177, 189, 210],
    targetLocations: [181, 184, 229],
    areaName: 'Castle Perimeter',
  },
];

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const CHARACTER_IDS = ['barbarian', 'ranger', 'mage', 'witch'] as const;

const CHARACTER_REWARD_ITEMS: Record<string, Record<QuestTier, string[]>> = {
  barbarian: {
    early: [
      EquipableIds.swordSteel,
      EquipableIds.axeBattle,
      EquipableIds.hammer,
      ScrollIds.rage,
      ScrollIds.mightyCleave,
      ScrollIds.warCry,
      ScrollIds.ironSkin,
    ],
    mid: [
      EquipableIds.swordLegendary,
      EquipableIds.axeWar,
      EquipableIds.warhammer,
      ScrollIds.whirlwind,
      ScrollIds.bloodthirst,
    ],
    late: [
      EquipableIds.swordArcane,
      EquipableIds.swordInferno,
      ScrollIds.berserker,
      ScrollIds.bloodthirst,
    ],
  },
  ranger: {
    early: [
      EquipableIds.bowLong,
      EquipableIds.dagger,
      ScrollIds.focus,
      ScrollIds.pinningShot,
      ScrollIds.evasiveStep,
    ],
    mid: [
      EquipableIds.bowElven,
      EquipableIds.crossbow,
      EquipableIds.daggerVenom,
      ScrollIds.multiShot,
      ScrollIds.poisonArrow,
    ],
    late: [
      EquipableIds.bowLegendary,
      EquipableIds.crossbow,
      ScrollIds.sniperShot,
      ScrollIds.callCompanion,
    ],
  },
  mage: {
    early: [
      EquipableIds.staffOrb,
      ScrollIds.spiritArrow,
      ScrollIds.heal,
      ScrollIds.fireBall,
      ScrollIds.shield,
      ScrollIds.strength,
      ScrollIds.tangleTwist,
    ],
    mid: [
      EquipableIds.staffRuby,
      ScrollIds.fireWall,
      ScrollIds.healingAura,
      ScrollIds.shieldWall,
      ScrollIds.strengthAura,
    ],
    late: [
      EquipableIds.staffCrystal,
      EquipableIds.staffSun,
      ScrollIds.timeWarp,
      ScrollIds.fireRain,
      ScrollIds.healingAura,
    ],
  },
  witch: {
    early: [
      EquipableIds.staffSkull,
      ScrollIds.iceShards,
      ScrollIds.fear,
      ScrollIds.iceStorm,
    ],
    mid: [
      EquipableIds.staffRuby,
      ScrollIds.terror,
      ScrollIds.poisonCloud,
      ScrollIds.lightning,
    ],
    late: [
      EquipableIds.staffCrystal,
      EquipableIds.staffEarth,
      ScrollIds.lightning,
      ScrollIds.poisonCloud,
      ScrollIds.terror,
    ],
  },
};

function generateQuestReward(tier: QuestTier, assignedPlayerId?: string): QuestReward {
  const charItemPool = assignedPlayerId ? CHARACTER_REWARD_ITEMS[assignedPlayerId]?.[tier] : undefined;
  if (tier === 'early') {
    const hasItem = charItemPool ? true : Math.random() < 0.6;
    return {
      coins: randomInt(35, 65),
      points: randomInt(80, 150),
      itemId: charItemPool ? pickRandom(charItemPool) : hasItem ? pickRandom(EARLY_REWARD_ITEMS) : undefined,
    };
  }
  if (tier === 'mid') {
    const hasItem = charItemPool ? true : Math.random() < 0.75;
    return {
      coins: randomInt(75, 140),
      points: randomInt(160, 280),
      itemId: charItemPool ? pickRandom(charItemPool) : hasItem ? pickRandom(MID_REWARD_ITEMS) : undefined,
    };
  }
  return {
    coins: randomInt(150, 260),
    points: randomInt(300, 500),
    itemId: charItemPool ? pickRandom(charItemPool) : pickRandom(LATE_REWARD_ITEMS),
  };
}

function instantiateTemplate(
  template: QuestTemplate,
  index: number,
  offerLocation: number,
  assignedPlayerId?: string,
): QuestInstance {
  const questId = `quest-${index + 1}-${template.id}`;
  const scope: QuestScope = assignedPlayerId ? 'player' : 'shared';
  const reward = generateQuestReward(template.tier, assignedPlayerId);

  const instance: QuestInstance = {
    id: questId,
    templateId: template.id,
    title: template.titleTemplate,
    description: template.descriptionTemplate,
    category: template.category,
    scope,
    tier: template.tier,
    status: 'available',
    offerLocation,
    assignedPlayerId,
    reward,
    areaName: template.areaName,
  };

  if (template.category === 'retrieve_item' || template.category === 'deliver_item') {
    const itemType = pickRandom(template.itemPool || QUEST_ITEMS_ALL);
    instance.itemType = itemType;
    const itemName = allItems[itemType]?.name || 'Quest Relic';
    instance.title = instance.title.replace('{item}', itemName);
    instance.description = instance.description.replace(/\{item\}/g, itemName);
  }

  if (template.category === 'retrieve_item' || template.category === 'rescue_npc' || template.category === 'slay_boss') {
    const pool = (template.targetLocations || [1]).filter(loc => loc !== offerLocation);
    const actualTarget = pickRandom(pool.length > 0 ? pool : template.targetLocations || [1]);
    const hintCount = Math.min(template.hintCount || 2, (template.targetLocations || [actualTarget]).length);
    const decoys = shuffle((template.targetLocations || []).filter(loc => loc !== actualTarget)).slice(0, Math.max(0, hintCount - 1));
    const hintLocations = [actualTarget, ...decoys].sort((a, b) => a - b);

    instance.actualTargetLocation = actualTarget;
    instance.hintLocations = hintLocations;
    instance.description = instance.description.replace(/\{locations\}/g, hintLocations.join(', '));
  }

  if (template.category === 'deliver_item' || template.category === 'escort_npc' || template.category === 'rescue_npc') {
    const destPool = (template.destinationLocations || [offerLocation]).filter(
      loc => template.category === 'rescue_npc' || loc !== offerLocation
    );
    const destinationLocation = pickRandom(destPool.length > 0 ? destPool : [offerLocation]);
    instance.destinationLocation = destinationLocation;
    instance.description = instance.description.replace(/\{destination\}/g, `${destinationLocation}`);
  }

  if (template.category === 'escort_npc' || template.category === 'rescue_npc') {
    const npcName = pickRandom(template.npcNames || ['Traveller']);
    const npcTemplate = pickRandom(NPC_DATA);
    instance.npcName = npcName;
    instance.npcCharacterType = npcTemplate.type;
    instance.npcIconXY = { ...npcTemplate.iconXY };
    instance.title = instance.title.replace('{npc}', npcName);
    instance.description = instance.description.replace(/\{npc\}/g, npcName);
  }

  if (template.category === 'clear_dungeon' || template.category === 'scout_area') {
    const targetLocations = [...(template.targetLocations || [])].sort((a, b) => a - b);
    instance.targetLocations = targetLocations;
    if (template.category === 'scout_area') {
      instance.scoutedLocations = [];
    }
    instance.description = instance.description.replace(/\{locations\}/g, targetLocations.join(', '));
  }

  if (template.category === 'slay_boss') {
    const monsterType = pickRandom(template.monsterPool || ['ogre']);
    const bossBaseName = pickRandom(template.bossNames || ['Dread Maw']);
    const monsterTypeName = monsters[monsterType]?.name || 'Monster';
    instance.monsterType = monsterType;
    instance.bossName = `${bossBaseName} (${monsterTypeName})`;
    instance.title = instance.title.replace('{boss}', bossBaseName);
    instance.description = instance.description.replace(/\{boss\}/g, `${bossBaseName} the ${monsterTypeName}`);
  }

  instance.description = instance.description.replace(/\{offer\}/g, `${offerLocation}`);

  return instance;
}

const neighboursCache = new Map<number, Set<number>>();

/**
 * Returns all locations neighbouring the given location.
 * Includes direct movement graph connections as well as adjacent 2D grid cells.
 */
export function getNeighbourLocations(locationId: number): Set<number> {
  const cached = neighboursCache.get(locationId);
  if (cached) return cached;

  const neighbours = new Set<number>();
  const loc = sharedLocations.find(l => l.id === locationId);
  if (loc) {
    for (const m of loc.move) {
      neighbours.add(m.id);
    }
  }

  for (const other of sharedLocations) {
    if (other.id !== locationId && other.move.some(m => m.id === locationId)) {
      neighbours.add(other.id);
    }
  }

  const coords = getCellCoordinates(locationId);
  if (coords.row !== -1 && coords.col !== -1) {
    for (let r = Math.max(0, coords.row - 1); r <= Math.min(MAP_ROWS - 1, coords.row + 1); r++) {
      for (let c = Math.max(0, coords.col - 1); c <= Math.min(MAP_COLUMNS - 1, coords.col + 1); c++) {
        const cell = getCellAtCoordinates({ row: r, col: c });
        if (cell > 0 && cell !== locationId) {
          neighbours.add(cell);
        }
      }
    }
  }

  neighboursCache.set(locationId, neighbours);
  return neighbours;
}

/**
 * Returns true if two locations are the same or neighbours on the map.
 */
export function areLocationsNeighbours(locA: number, locB: number): boolean {
  if (locA === locB) return true;
  return getNeighbourLocations(locA).has(locB);
}

/**
 * Returns the Manhattan distance between two locations on the board grid.
 */
export function getLocationDistance(locA: number, locB: number): number {
  const a = getCellCoordinates(locA);
  const b = getCellCoordinates(locB);
  if (a.row === -1 || b.row === -1) return 99;
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

/**
 * Maps a location to one of 6 geographic sectors across the 12x20 board:
 * Rows 0..5 (South: 0, 1, 2 for West, Center, East)
 * Rows 6..11 (North: 3, 4, 5 for West, Center, East)
 */
export function getMapSector(locationId: number): number {
  const { row, col } = getCellCoordinates(locationId);
  if (row === -1 || col === -1) return 0;
  const rowSector = row < 6 ? 0 : 1;
  const colSector = col < 7 ? 0 : col < 14 ? 1 : 2;
  return rowSector * 3 + colSector;
}

export function generateQuestsForGame(
  minQuests = 22,
  maxQuests = 28,
  excludedOfferLocations: number[] = [224],
): QuestInstance[] {
  const targetCount = randomInt(minQuests, maxQuests);
  const usedOfferLocations = new Set<number>(excludedOfferLocations);
  const usedTemplateIds = new Set<string>();
  const sectorCounts = [0, 0, 0, 0, 0, 0];
  const rawChoices: { template: QuestTemplate; offerLocation: number }[] = [];

  while (rawChoices.length < targetCount) {
    interface Candidate {
      template: QuestTemplate;
      offerLocation: number;
      sector: number;
      neighbourCount: number;
      minDist: number;
      score: number;
    }

    const candidates: Candidate[] = [];

    const availableTemplates = QUEST_TEMPLATES.some(t => !usedTemplateIds.has(t.id))
      ? QUEST_TEMPLATES.filter(t => !usedTemplateIds.has(t.id))
      : QUEST_TEMPLATES;

    for (const template of availableTemplates) {
      for (const loc of template.offerLocations) {
        // STRICT: Never allow two quests at the same location
        if (usedOfferLocations.has(loc)) continue;

        const sector = getMapSector(loc);
        const neighbours = getNeighbourLocations(loc);

        let neighbourCount = 0;
        let neighbourCascadePenalty = 0;
        for (const usedLoc of usedOfferLocations) {
          if (neighbours.has(usedLoc)) {
            neighbourCount++;
            const uNeighbours = getNeighbourLocations(usedLoc);
            let uExistingNeighbours = 0;
            for (const otherUsed of usedOfferLocations) {
              if (uNeighbours.has(otherUsed)) uExistingNeighbours++;
            }
            neighbourCascadePenalty += uExistingNeighbours * 350;
          }
        }

        const coords = getCellCoordinates(loc);
        let minDist = 99;
        for (const usedLoc of usedOfferLocations) {
          const uCoords = getCellCoordinates(usedLoc);
          const dist = Math.abs(coords.row - uCoords.row) + Math.abs(coords.col - uCoords.col);
          if (dist < minDist) minDist = dist;
        }

        // Scoring:
        // 1. Sector balancing: penalize sectors with more quests so quests are spread evenly across the map
        // 2. Neighbour limit: penalize candidate locations that have neighbouring quests and cascade onto existing neighbours
        // 3. Spreading out: reward larger minimum distance to already placed quests
        // 4. Random jitter: slight randomness to ensure varied layouts across games
        const score =
          -sectorCounts[sector] * 60 -
          neighbourCount * 250 -
          neighbourCascadePenalty +
          minDist * 4 +
          Math.random() * 8;

        candidates.push({
          template,
          offerLocation: loc,
          sector,
          neighbourCount,
          minDist,
          score,
        });
      }
    }

    if (candidates.length === 0) {
      break;
    }

    // Sort descending by score to pick the best spread candidate
    candidates.sort((a, b) => b.score - a.score);
    const chosen = candidates[0];

    rawChoices.push({ template: chosen.template, offerLocation: chosen.offerLocation });
    usedOfferLocations.add(chosen.offerLocation);
    usedTemplateIds.add(chosen.template.id);
    sectorCounts[chosen.sector]++;
  }

  // Assign 2-3 personal quests for each character, and make the remainder shared
  const personalAssignments: (string | undefined)[] = [];
  for (const characterId of CHARACTER_IDS) {
    const countForChar = randomInt(2, 3);
    for (let i = 0; i < countForChar; i++) {
      personalAssignments.push(characterId);
    }
  }
  while (personalAssignments.length < rawChoices.length) {
    personalAssignments.push(undefined);
  }
  const shuffledAssignments = shuffle(personalAssignments);

  return rawChoices.map((choice, index) =>
    instantiateTemplate(choice.template, index, choice.offerLocation, shuffledAssignments[index]),
  );
}

