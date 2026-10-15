import { sharedLocations } from '../shared-locations';
import { cauldronOfFireItems } from '../cauldron-of-fire/items';
import { cauldronOfFireStoreItems } from '../cauldron-of-fire/stores';
import { cauldronOfFirePortals } from '../cauldron-of-fire/portals';

import { GameListEntry } from '../../types';
import { characters } from '../../characters';

export const raceOfFire: GameListEntry = {
  id: 'racefire',
  name: 'Race of Fire',
  map: 'cauldron',
  description: 'Race to be first to collect 3 Fire Crystal Shards and take them to the castle.',
  heroImage: '/hero-race.png',
  characters: [
    { ...characters.barbarian },
    { ...characters.witch },
    { ...characters.mage },
    { ...characters.ranger }
  ],
  locations: sharedLocations,
  itemLocations: cauldronOfFireItems,
  storeItems: cauldronOfFireStoreItems,
  portalLocations: cauldronOfFirePortals.filter(p => p !== 184), // Not the castle gates
  gameTips: [
    {
      turn: 0,
      markDownMessage: '*Portal* to the village at **92** or **23** to spend your *Coins*.'
    },
    {
      turn: 1,
      character: 'barbarian',
      markDownMessage: 'Apply your stats. A *Barbarian* needs **Strength** for melee combat and **Resilience** for health'
    },
    {
      turn: 1,
      character: 'ranger',
      markDownMessage: 'Apply your stats. A *Ranger* needs **Skill** for ranged combat and **Resilience** for health'
    },
    {
      turn: 1,
      character: 'mage',
      markDownMessage: 'Apply your stats. A *Mage* needs **Intelligence** for magic and **Resilience** for health'
    },
    {
      turn: 1,
      character: 'witch',
      markDownMessage: 'Apply your stats. A *Witch* needs **Intelligence** for magic and **Resilience** for health'
    },
    {
      turn: 2,
      markDownMessage: 'You need to be **stronger**! Buy gear or hire an NPC at the shops.'
    },
    {
      turn: 5,
      markDownMessage: 'Monsters are more dangerous away from roads, further north and underground.'
    },
  ]
};
