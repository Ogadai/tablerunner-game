import { sharedLocations } from '../shared-locations';

import { GameListEntry } from '../../types';
import { characters } from '../../characters';
import { warlordsOfFireStoreItems, visitedLocations } from './stores';
import { warlordsOfFireItems } from './items';

export const warlordsOfFire: GameListEntry = {
  id: 'warlordsfire',
  name: 'Warlords of Fire',
  map: 'cauldron',
  description: 'Command your armies and battle for territory in this epic war.',
  heroImage: '/hero-war.png',
  characters: [
    { ...characters.barbarian },
    { ...characters.witch },
    { ...characters.mage },
    { ...characters.ranger }
  ],
  locations: sharedLocations,
  itemLocations: warlordsOfFireItems,
  storeItems: warlordsOfFireStoreItems,
  portalLocations: [],
  visitedLocations: visitedLocations,
  gameTips: [
    {
      turn: 0,
      character: 'barbarian',
      markDownMessage: 'Apply your stats. A *Barbarian* needs **Strength** for melee combat and **Resilience** for health'
    },
    {
      turn: 0,
      character: 'ranger',
      markDownMessage: 'Apply your stats. A *Ranger* needs **Skill** for ranged combat and **Resilience** for health'
    },
    {
      turn: 0,
      character: 'mage',
      markDownMessage: 'Apply your stats. A *Mage* needs **Intelligence** for magic and **Resilience** for health'
    },
    {
      turn: 0,
      character: 'witch',
      markDownMessage: 'Apply your stats. A *Witch* needs **Intelligence** for magic and **Resilience** for health'
    },
    {
      turn: 2,
      markDownMessage: '*Recruit* **monsters** them add them to your *Party*.'
    },
    {
      turn: 4,
      markDownMessage: 'Defeat **NPC Warlords** to recruit different monsters.'
    },
    {
      turn: 5,
      markDownMessage: 'Defeated **NPC Warlords** join your team.'
    },
  ]
};
