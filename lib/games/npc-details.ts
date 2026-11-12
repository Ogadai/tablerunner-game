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
    "gender": "male",
    "name": "Bror"
  },
  {
    "type": "barbarian",
    "race": "human",
    "gender": "male",
    "name": "Ragnar the Red"
  },
  {
    "type": "barbarian",
    "race": "human",
    "gender": "male",
    "name": "Skar"
  },
  {
    "type": "barbarian",
    "race": "human",
    "gender": "male",
    "name": "Ulf Skullsplitter"
  },
  {
    "type": "barbarian",
    "race": "human",
    "gender": "male",
    "name": "Torvald"
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
    "race": "human",
    "gender": "female",
    "name": "Freya"
  },
  {
    "type": "barbarian",
    "race": "human",
    "gender": "female",
    "name": "Skadi the Grim"
  },
  {
    "type": "barbarian",
    "race": "human",
    "gender": "female",
    "name": "Brynja"
  },
  {
    "type": "barbarian",
    "race": "human",
    "gender": "female",
    "name": "Sigrid Wolfblood"
  },
  {
    "type": "barbarian",
    "race": "human",
    "gender": "female",
    "name": "Ylva"
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
    "gender": "male",
    "name": "Theren"
  },
  {
    "type": "barbarian",
    "race": "elf",
    "gender": "male",
    "name": "Kaelen the Untamed"
  },
  {
    "type": "barbarian",
    "race": "elf",
    "gender": "male",
    "name": "Vorin"
  },
  {
    "type": "barbarian",
    "race": "elf",
    "gender": "male",
    "name": "Draven Fang"
  },
  {
    "type": "barbarian",
    "race": "elf",
    "gender": "male",
    "name": "Sovel"
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
    "race": "elf",
    "gender": "female",
    "name": "Sylva"
  },
  {
    "type": "barbarian",
    "race": "elf",
    "gender": "female",
    "name": "Naera the Gale"
  },
  {
    "type": "barbarian",
    "race": "elf",
    "gender": "female",
    "name": "Kaelis"
  },
  {
    "type": "barbarian",
    "race": "elf",
    "gender": "female",
    "name": "Lyra Thorn"
  },
  {
    "type": "barbarian",
    "race": "elf",
    "gender": "female",
    "name": "Vael"
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
    "gender": "male",
    "name": "Grimnir"
  },
  {
    "type": "barbarian",
    "race": "dwarf",
    "gender": "male",
    "name": "Thorek Crag"
  },
  {
    "type": "barbarian",
    "race": "dwarf",
    "gender": "male",
    "name": "Bardin"
  },
  {
    "type": "barbarian",
    "race": "dwarf",
    "gender": "male",
    "name": "Morgrum the Stout"
  },
  {
    "type": "barbarian",
    "race": "dwarf",
    "gender": "male",
    "name": "Skarn"
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
    "type": "barbarian",
    "race": "dwarf",
    "gender": "female",
    "name": "Gerda"
  },
  {
    "type": "barbarian",
    "race": "dwarf",
    "gender": "female",
    "name": "Inga Stonefist"
  },
  {
    "type": "barbarian",
    "race": "dwarf",
    "gender": "female",
    "name": "Thyra"
  },
  {
    "type": "barbarian",
    "race": "dwarf",
    "gender": "female",
    "name": "Ragna the Mighty"
  },
  {
    "type": "barbarian",
    "race": "dwarf",
    "gender": "female",
    "name": "Dagny"
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
    "gender": "male",
    "name": "Morvath"
  },
  {
    "type": "witch",
    "race": "human",
    "gender": "male",
    "name": "Bael the Pale"
  },
  {
    "type": "witch",
    "race": "human",
    "gender": "male",
    "name": "Kael"
  },
  {
    "type": "witch",
    "race": "human",
    "gender": "male",
    "name": "Vorn Blackthorn"
  },
  {
    "type": "witch",
    "race": "human",
    "gender": "male",
    "name": "Sable"
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
    "race": "human",
    "gender": "female",
    "name": "Morrigan"
  },
  {
    "type": "witch",
    "race": "human",
    "gender": "female",
    "name": "Circe Shadow"
  },
  {
    "type": "witch",
    "race": "human",
    "gender": "female",
    "name": "Belladonna"
  },
  {
    "type": "witch",
    "race": "human",
    "gender": "female",
    "name": "Elvira Hex"
  },
  {
    "type": "witch",
    "race": "human",
    "gender": "female",
    "name": "Rowena"
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
    "gender": "male",
    "name": "Zaphiel"
  },
  {
    "type": "witch",
    "race": "elf",
    "gender": "male",
    "name": "Malen Night"
  },
  {
    "type": "witch",
    "race": "elf",
    "gender": "male",
    "name": "Caelum"
  },
  {
    "type": "witch",
    "race": "elf",
    "gender": "male",
    "name": "Erevan Mist"
  },
  {
    "type": "witch",
    "race": "elf",
    "gender": "male",
    "name": "Vaelen"
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
    "race": "elf",
    "gender": "female",
    "name": "Seraphina"
  },
  {
    "type": "witch",
    "race": "elf",
    "gender": "female",
    "name": "Lunara Eclipse"
  },
  {
    "type": "witch",
    "race": "elf",
    "gender": "female",
    "name": "Aelith"
  },
  {
    "type": "witch",
    "race": "elf",
    "gender": "female",
    "name": "Morwenna Gloom"
  },
  {
    "type": "witch",
    "race": "elf",
    "gender": "female",
    "name": "Vespera"
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
    "gender": "male",
    "name": "Thrain"
  },
  {
    "type": "witch",
    "race": "dwarf",
    "gender": "male",
    "name": "Kili Cinder"
  },
  {
    "type": "witch",
    "race": "dwarf",
    "gender": "male",
    "name": "Balin"
  },
  {
    "type": "witch",
    "race": "dwarf",
    "gender": "male",
    "name": "Gloin Soot"
  },
  {
    "type": "witch",
    "race": "dwarf",
    "gender": "male",
    "name": "Oin"
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
    "type": "witch",
    "race": "dwarf",
    "gender": "female",
    "name": "Bryn"
  },
  {
    "type": "witch",
    "race": "dwarf",
    "gender": "female",
    "name": "Tova Ember"
  },
  {
    "type": "witch",
    "race": "dwarf",
    "gender": "female",
    "name": "Magnhild"
  },
  {
    "type": "witch",
    "race": "dwarf",
    "gender": "female",
    "name": "Eira Hex"
  },
  {
    "type": "witch",
    "race": "dwarf",
    "gender": "female",
    "name": "Kari"
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
    "gender": "male",
    "name": "Garrick"
  },
  {
    "type": "ranger",
    "race": "human",
    "gender": "male",
    "name": "Rowan Hawkeye"
  },
  {
    "type": "ranger",
    "race": "human",
    "gender": "male",
    "name": "Corin"
  },
  {
    "type": "ranger",
    "race": "human",
    "gender": "male",
    "name": "Alden Strider"
  },
  {
    "type": "ranger",
    "race": "human",
    "gender": "male",
    "name": "Hunter"
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
    "race": "human",
    "gender": "female",
    "name": "Wren"
  },
  {
    "type": "ranger",
    "race": "human",
    "gender": "female",
    "name": "Willow Brooks"
  },
  {
    "type": "ranger",
    "race": "human",
    "gender": "female",
    "name": "Ivy"
  },
  {
    "type": "ranger",
    "race": "human",
    "gender": "female",
    "name": "Meadow Swift"
  },
  {
    "type": "ranger",
    "race": "human",
    "gender": "female",
    "name": "Laurel"
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
    "gender": "male",
    "name": "Thranduil"
  },
  {
    "type": "ranger",
    "race": "elf",
    "gender": "male",
    "name": "Beleg Strongbow"
  },
  {
    "type": "ranger",
    "race": "elf",
    "gender": "male",
    "name": "Orophin"
  },
  {
    "type": "ranger",
    "race": "elf",
    "gender": "male",
    "name": "Gildor Leaf"
  },
  {
    "type": "ranger",
    "race": "elf",
    "gender": "male",
    "name": "Elladan"
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
    "race": "elf",
    "gender": "female",
    "name": "Tauriel"
  },
  {
    "type": "ranger",
    "race": "elf",
    "gender": "female",
    "name": "Celebrían Vale"
  },
  {
    "type": "ranger",
    "race": "elf",
    "gender": "female",
    "name": "Lúthiel"
  },
  {
    "type": "ranger",
    "race": "elf",
    "gender": "female",
    "name": "Elanor Arrow"
  },
  {
    "type": "ranger",
    "race": "elf",
    "gender": "female",
    "name": "Míriel"
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
    "gender": "male",
    "name": "Thorin"
  },
  {
    "type": "ranger",
    "race": "dwarf",
    "gender": "male",
    "name": "Dain Crag"
  },
  {
    "type": "ranger",
    "race": "dwarf",
    "gender": "male",
    "name": "Farin"
  },
  {
    "type": "ranger",
    "race": "dwarf",
    "gender": "male",
    "name": "Thror Ridge"
  },
  {
    "type": "ranger",
    "race": "dwarf",
    "gender": "male",
    "name": "Frar"
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
    "type": "ranger",
    "race": "dwarf",
    "gender": "female",
    "name": "Yrsa"
  },
  {
    "type": "ranger",
    "race": "dwarf",
    "gender": "female",
    "name": "Sigrun Trail"
  },
  {
    "type": "ranger",
    "race": "dwarf",
    "gender": "female",
    "name": "Alfhild"
  },
  {
    "type": "ranger",
    "race": "dwarf",
    "gender": "female",
    "name": "Gerd Cairn"
  },
  {
    "type": "ranger",
    "race": "dwarf",
    "gender": "female",
    "name": "Vigdis"
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
    "gender": "male",
    "name": "Alatar"
  },
  {
    "type": "mage",
    "race": "human",
    "gender": "male",
    "name": "Saruman White"
  },
  {
    "type": "mage",
    "race": "human",
    "gender": "male",
    "name": "Pallando"
  },
  {
    "type": "mage",
    "race": "human",
    "gender": "male",
    "name": "Zeddicus Rune"
  },
  {
    "type": "mage",
    "race": "human",
    "gender": "male",
    "name": "Aurelius"
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
    "race": "human",
    "gender": "female",
    "name": "Elowen"
  },
  {
    "type": "mage",
    "race": "human",
    "gender": "female",
    "name": "Sylphie Light"
  },
  {
    "type": "mage",
    "race": "human",
    "gender": "female",
    "name": "Sabrina"
  },
  {
    "type": "mage",
    "race": "human",
    "gender": "female",
    "name": "Nymue Astral"
  },
  {
    "type": "mage",
    "race": "human",
    "gender": "female",
    "name": "Isolde"
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
    "gender": "male",
    "name": "Elrond"
  },
  {
    "type": "mage",
    "race": "elf",
    "gender": "male",
    "name": "Glorfindel Gold"
  },
  {
    "type": "mage",
    "race": "elf",
    "gender": "male",
    "name": "Turgon"
  },
  {
    "type": "mage",
    "race": "elf",
    "gender": "male",
    "name": "Ecthelion Spire"
  },
  {
    "type": "mage",
    "race": "elf",
    "gender": "male",
    "name": "Maedhros"
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
    "race": "elf",
    "gender": "female",
    "name": "Galadriel"
  },
  {
    "type": "mage",
    "race": "elf",
    "gender": "female",
    "name": "Varda Dawn"
  },
  {
    "type": "mage",
    "race": "elf",
    "gender": "female",
    "name": "Yavanna"
  },
  {
    "type": "mage",
    "race": "elf",
    "gender": "female",
    "name": "Nienna Mist"
  },
  {
    "type": "mage",
    "race": "elf",
    "gender": "female",
    "name": "Estë"
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
    "gender": "male",
    "name": "Khîm"
  },
  {
    "type": "mage",
    "race": "dwarf",
    "gender": "male",
    "name": "Ibun Spark"
  },
  {
    "type": "mage",
    "race": "dwarf",
    "gender": "male",
    "name": "Fundor"
  },
  {
    "type": "mage",
    "race": "dwarf",
    "gender": "male",
    "name": "Bragi Forge"
  },
  {
    "type": "mage",
    "race": "dwarf",
    "gender": "male",
    "name": "Lóni"
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
  },
  {
    "type": "mage",
    "race": "dwarf",
    "gender": "female",
    "name": "Nanna"
  },
  {
    "type": "mage",
    "race": "dwarf",
    "gender": "female",
    "name": "Sif Hearth"
  },
  {
    "type": "mage",
    "race": "dwarf",
    "gender": "female",
    "name": "Hlin"
  },
  {
    "type": "mage",
    "race": "dwarf",
    "gender": "female",
    "name": "Eir Crystal"
  },
  {
    "type": "mage",
    "race": "dwarf",
    "gender": "female",
    "name": "Saga"
  }
];
