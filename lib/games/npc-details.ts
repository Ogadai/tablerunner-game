export const NPC_DATA: {
  type: 'barbarian' | 'witch' | 'ranger' | 'mage',
  race: 'human' | 'elf' | 'dwarf',
  iconXY: { x: number, y: number },
  gender: 'male' | 'female'
}[] = [
  {
    type: 'barbarian',
    race: 'human',
    iconXY: { x: 0, y: 1 },
    gender: 'male',
  },
  {
    type: 'barbarian',
    race: 'human',
    iconXY: { x: 0, y: 2 },
    gender: 'female',
  },
  {
    type: 'barbarian',
    race: 'elf',
    iconXY: { x: 0, y: 3 },
    gender: 'male',
  },
  {
    type: 'barbarian',
    race: 'dwarf',
    iconXY: { x: 0, y: 4 },
    gender: 'male',
  },
  {
    type: 'witch',
    race: 'human',
    iconXY: { x: 1, y: 1 },
    gender: 'male',
  },
  {
    type: 'witch',
    race: 'human',
    iconXY: { x: 1, y: 2 },
    gender: 'female',
  },
  {
    type: 'witch',
    race: 'elf',
    iconXY: { x: 1, y: 3 },
    gender: 'male',
  },
  {
    type: 'witch',
    race: 'dwarf',
    iconXY: { x: 1, y: 4 },
    gender: 'male',
  },
  {
    type: 'ranger',
    race: 'human',
    iconXY: { x: 2, y: 1 },
    gender: 'female',
  },
  {
    type: 'ranger',
    race: 'human',
    iconXY: { x: 2, y: 2 },
    gender: 'male',
  },
  {
    type: 'ranger',
    race: 'elf',
    iconXY: { x: 2, y: 3 },
    gender: 'female',
  },
  {
    type: 'ranger',
    race: 'dwarf',
    iconXY: { x: 2, y: 4 },
    gender: 'female',
  },
  {
    type: 'mage',
    race: 'human',
    iconXY: { x: 3, y: 1 },
    gender: 'male',
  },
  {
    type: 'mage',
    race: 'human',
    iconXY: { x: 3, y: 2 },
    gender: 'female',
  },
  {
    type: 'mage',
    race: 'elf',
    iconXY: { x: 3, y: 3 },
    gender: 'female',
  },
  {
    type: 'mage',
    race: 'dwarf',
    iconXY: { x: 3, y: 4 },
    gender: 'male',
  },
];

export const NPC_NAMES: {
  type: 'barbarian' | 'witch' | 'ranger' | 'mage',
  race: 'human' | 'elf' | 'dwarf',
  gender: 'male' | 'female',
  name: string,
}[] = [
  {
    "type": "barbarian",
    "race": "human",
    "gender": "male",
    "name": "Krunk"
  },
  {
    "type": "barbarian",
    "race": "human",
    "gender": "male",
    "name": "Thorgar the Bold"
  },
  {
    "type": "barbarian",
    "race": "human",
    "gender": "male",
    "name": "Hroth"
  },
  {
    "type": "barbarian",
    "race": "human",
    "gender": "male",
    "name": "Garr Bloodaxe"
  },
  {
    "type": "barbarian",
    "race": "human",
    "gender": "male",
    "name": "Brak"
  },
  {
    "type": "barbarian",
    "race": "human",
    "gender": "female",
    "name": "Gormla"
  },
  {
    "type": "barbarian",
    "race": "human",
    "gender": "female",
    "name": "Valka the Fierce"
  },
  {
    "type": "barbarian",
    "race": "human",
    "gender": "female",
    "name": "Thora"
  },
  {
    "type": "barbarian",
    "race": "human",
    "gender": "female",
    "name": "Hilda Ironbrow"
  },
  {
    "type": "barbarian",
    "race": "human",
    "gender": "female",
    "name": "Astrid"
  },
  {
    "type": "barbarian",
    "race": "elf",
    "gender": "male",
    "name": "Faelar"
  },
  {
    "type": "barbarian",
    "race": "elf",
    "gender": "male",
    "name": "Orin the Swift"
  },
  {
    "type": "barbarian",
    "race": "elf",
    "gender": "male",
    "name": "Tathar"
  },
  {
    "type": "barbarian",
    "race": "elf",
    "gender": "male",
    "name": "Elas Wildrunner"
  },
  {
    "type": "barbarian",
    "race": "elf",
    "gender": "male",
    "name": "Kith"
  },
  {
    "type": "barbarian",
    "race": "elf",
    "gender": "female",
    "name": "Mireel"
  },
  {
    "type": "barbarian",
    "race": "elf",
    "gender": "female",
    "name": "Sari the Wild"
  },
  {
    "type": "barbarian",
    "race": "elf",
    "gender": "female",
    "name": "Lira"
  },
  {
    "type": "barbarian",
    "race": "elf",
    "gender": "female",
    "name": "Taria Storm"
  },
  {
    "type": "barbarian",
    "race": "elf",
    "gender": "female",
    "name": "Ael"
  },
  {
    "type": "barbarian",
    "race": "dwarf",
    "gender": "male",
    "name": "Drok"
  },
  {
    "type": "barbarian",
    "race": "dwarf",
    "gender": "male",
    "name": "Krag Hammer"
  },
  {
    "type": "barbarian",
    "race": "dwarf",
    "gender": "male",
    "name": "Burl"
  },
  {
    "type": "barbarian",
    "race": "dwarf",
    "gender": "male",
    "name": "Torg the Grim"
  },
  {
    "type": "barbarian",
    "race": "dwarf",
    "gender": "male",
    "name": "Farg"
  },
  {
    "type": "barbarian",
    "race": "dwarf",
    "gender": "female",
    "name": "Helga"
  },
  {
    "type": "barbarian",
    "race": "dwarf",
    "gender": "female",
    "name": "Berta Strong"
  },
  {
    "type": "barbarian",
    "race": "dwarf",
    "gender": "female",
    "name": "Gunda"
  },
  {
    "type": "barbarian",
    "race": "dwarf",
    "gender": "female",
    "name": "Ulla Ironfoot"
  },
  {
    "type": "barbarian",
    "race": "dwarf",
    "gender": "female",
    "name": "Brunh"
  },
  {
    "type": "witch",
    "race": "human",
    "gender": "male",
    "name": "Malakor"
  },
  {
    "type": "witch",
    "race": "human",
    "gender": "male",
    "name": "Vex the Wise"
  },
  {
    "type": "witch",
    "race": "human",
    "gender": "male",
    "name": "Zoran"
  },
  {
    "type": "witch",
    "race": "human",
    "gender": "male",
    "name": "Corv Darkeye"
  },
  {
    "type": "witch",
    "race": "human",
    "gender": "male",
    "name": "MORTIS"
  },
  {
    "type": "witch",
    "race": "human",
    "gender": "female",
    "name": "Hekate"
  },
  {
    "type": "witch",
    "race": "human",
    "gender": "female",
    "name": "Vesper Doom"
  },
  {
    "type": "witch",
    "race": "human",
    "gender": "female",
    "name": "Morgan"
  },
  {
    "type": "witch",
    "race": "human",
    "gender": "female",
    "name": "Lilith Bane"
  },
  {
    "type": "witch",
    "race": "human",
    "gender": "female",
    "name": "Raven"
  },
  {
    "type": "witch",
    "race": "elf",
    "gender": "male",
    "name": "Aelion"
  },
  {
    "type": "witch",
    "race": "elf",
    "gender": "male",
    "name": "Sylas Moon"
  },
  {
    "type": "witch",
    "race": "elf",
    "gender": "male",
    "name": "Oryn"
  },
  {
    "type": "witch",
    "race": "elf",
    "gender": "male",
    "name": "Valen Shade"
  },
  {
    "type": "witch",
    "race": "elf",
    "gender": "male",
    "name": "Nox"
  },
  {
    "type": "witch",
    "race": "elf",
    "gender": "female",
    "name": "Nyx"
  },
  {
    "type": "witch",
    "race": "elf",
    "gender": "female",
    "name": "Ilvara Star"
  },
  {
    "type": "witch",
    "race": "elf",
    "gender": "female",
    "name": "Selene"
  },
  {
    "type": "witch",
    "race": "elf",
    "gender": "female",
    "name": "Vanya Dusk"
  },
  {
    "type": "witch",
    "race": "elf",
    "gender": "female",
    "name": "Thalia"
  },
  {
    "type": "witch",
    "race": "dwarf",
    "gender": "male",
    "name": "Grom"
  },
  {
    "type": "witch",
    "race": "dwarf",
    "gender": "male",
    "name": "Dwalin Rune"
  },
  {
    "type": "witch",
    "race": "dwarf",
    "gender": "male",
    "name": "Bofur"
  },
  {
    "type": "witch",
    "race": "dwarf",
    "gender": "male",
    "name": "Nori Coal"
  },
  {
    "type": "witch",
    "race": "dwarf",
    "gender": "male",
    "name": "Ori"
  },
  {
    "type": "witch",
    "race": "dwarf",
    "gender": "female",
    "name": "Dís"
  },
  {
    "type": "witch",
    "race": "dwarf",
    "gender": "female",
    "name": "Katla Ash"
  },
  {
    "type": "witch",
    "race": "dwarf",
    "gender": "female",
    "name": "Runa"
  },
  {
    "type": "witch",
    "race": "dwarf",
    "gender": "female",
    "name": "Siv Spell"
  },
  {
    "type": "witch",
    "race": "dwarf",
    "gender": "female",
    "name": "Frida"
  },
  {
    "type": "ranger",
    "race": "human",
    "gender": "male",
    "name": "Will"
  },
  {
    "type": "ranger",
    "race": "human",
    "gender": "male",
    "name": "Archer Green"
  },
  {
    "type": "ranger",
    "race": "human",
    "gender": "male",
    "name": "Colt"
  },
  {
    "type": "ranger",
    "race": "human",
    "gender": "male",
    "name": "Fletcher"
  },
  {
    "type": "ranger",
    "race": "human",
    "gender": "male",
    "name": "Randal Scout"
  },
  {
    "type": "ranger",
    "race": "human",
    "gender": "female",
    "name": "Robin"
  },
  {
    "type": "ranger",
    "race": "human",
    "gender": "female",
    "name": "Hazel Wood"
  },
  {
    "type": "ranger",
    "race": "human",
    "gender": "female",
    "name": "Brier"
  },
  {
    "type": "ranger",
    "race": "human",
    "gender": "female",
    "name": "Fern Leaf"
  },
  {
    "type": "ranger",
    "race": "human",
    "gender": "female",
    "name": "Holly"
  },
  {
    "type": "ranger",
    "race": "elf",
    "gender": "male",
    "name": "Legolas"
  },
  {
    "type": "ranger",
    "race": "elf",
    "gender": "male",
    "name": "Haldir Tall"
  },
  {
    "type": "ranger",
    "race": "elf",
    "gender": "male",
    "name": "Rúmil"
  },
  {
    "type": "ranger",
    "race": "elf",
    "gender": "male",
    "name": "Cirdan Wind"
  },
  {
    "type": "ranger",
    "race": "elf",
    "gender": "male",
    "name": "Lindir"
  },
  {
    "type": "ranger",
    "race": "elf",
    "gender": "female",
    "name": "Arwen"
  },
  {
    "type": "ranger",
    "race": "elf",
    "gender": "female",
    "name": "Idril Fair"
  },
  {
    "type": "ranger",
    "race": "elf",
    "gender": "female",
    "name": "Galad"
  },
  {
    "type": "ranger",
    "race": "elf",
    "gender": "female",
    "name": "Nimrodel"
  },
  {
    "type": "ranger",
    "race": "elf",
    "gender": "female",
    "name": "Finduilas Bow"
  },
  {
    "type": "ranger",
    "race": "dwarf",
    "gender": "male",
    "name": "Durin"
  },
  {
    "type": "ranger",
    "race": "dwarf",
    "gender": "male",
    "name": "Nain Flint"
  },
  {
    "type": "ranger",
    "race": "dwarf",
    "gender": "male",
    "name": "Fundin"
  },
  {
    "type": "ranger",
    "race": "dwarf",
    "gender": "male",
    "name": "Groin Stone"
  },
  {
    "type": "ranger",
    "race": "dwarf",
    "gender": "male",
    "name": "Borin"
  },
  {
    "type": "ranger",
    "race": "dwarf",
    "gender": "female",
    "name": "Thrud"
  },
  {
    "type": "ranger",
    "race": "dwarf",
    "gender": "female",
    "name": "Astrid Cliff"
  },
  {
    "type": "ranger",
    "race": "dwarf",
    "gender": "female",
    "name": "Signy"
  },
  {
    "type": "ranger",
    "race": "dwarf",
    "gender": "female",
    "name": "Solveig Peak"
  },
  {
    "type": "ranger",
    "race": "dwarf",
    "gender": "female",
    "name": "Gunilla"
  },
  {
    "type": "mage",
    "race": "human",
    "gender": "male",
    "name": "Merlin"
  },
  {
    "type": "mage",
    "race": "human",
    "gender": "male",
    "name": "Gandalf Grey"
  },
  {
    "type": "mage",
    "race": "human",
    "gender": "male",
    "name": "Radagast"
  },
  {
    "type": "mage",
    "race": "human",
    "gender": "male",
    "name": "Elminster Sage"
  },
  {
    "type": "mage",
    "race": "human",
    "gender": "male",
    "name": "Phaer"
  },
  {
    "type": "mage",
    "race": "human",
    "gender": "female",
    "name": "Tasha"
  },
  {
    "type": "mage",
    "race": "human",
    "gender": "female",
    "name": "Jallarzi Spell"
  },
  {
    "type": "mage",
    "race": "human",
    "gender": "female",
    "name": "Morden"
  },
  {
    "type": "mage",
    "race": "human",
    "gender": "female",
    "name": "Alustriel Star"
  },
  {
    "type": "mage",
    "race": "human",
    "gender": "female",
    "name": "Khelben"
  },
  {
    "type": "mage",
    "race": "elf",
    "gender": "male",
    "name": "Fëanor"
  },
  {
    "type": "mage",
    "race": "elf",
    "gender": "male",
    "name": "Fingolfin Star"
  },
  {
    "type": "mage",
    "race": "elf",
    "gender": "male",
    "name": "Finrod"
  },
  {
    "type": "mage",
    "race": "elf",
    "gender": "male",
    "name": "Celeborn Wise"
  },
  {
    "type": "mage",
    "race": "elf",
    "gender": "male",
    "name": "Sauron"
  },
  {
    "type": "mage",
    "race": "elf",
    "gender": "female",
    "name": "Lúthien"
  },
  {
    "type": "mage",
    "race": "elf",
    "gender": "female",
    "name": "Melian Bright"
  },
  {
    "type": "mage",
    "race": "elf",
    "gender": "female",
    "name": "Imin"
  },
  {
    "type": "mage",
    "race": "elf",
    "gender": "female",
    "name": "Enel Moon"
  },
  {
    "type": "mage",
    "race": "elf",
    "gender": "female",
    "name": "Iminy"
  },
  {
    "type": "mage",
    "race": "dwarf",
    "gender": "male",
    "name": "Azaghâl"
  },
  {
    "type": "mage",
    "race": "dwarf",
    "gender": "male",
    "name": "Gabil Flame"
  },
  {
    "type": "mage",
    "race": "dwarf",
    "gender": "male",
    "name": "Narvi"
  },
  {
    "type": "mage",
    "race": "dwarf",
    "gender": "male",
    "name": "Telchar Smith"
  },
  {
    "type": "mage",
    "race": "dwarf",
    "gender": "male",
    "name": "Mîm"
  },
  {
    "type": "mage",
    "race": "dwarf",
    "gender": "female",
    "name": "Kaltra"
  },
  {
    "type": "mage",
    "race": "dwarf",
    "gender": "female",
    "name": "Mara Stone"
  },
  {
    "type": "mage",
    "race": "dwarf",
    "gender": "female",
    "name": "Torvi"
  },
  {
    "type": "mage",
    "race": "dwarf",
    "gender": "female",
    "name": "Berta Coal"
  },
  {
    "type": "mage",
    "race": "dwarf",
    "gender": "female",
    "name": "Valka"
  }
];
