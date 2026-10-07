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
};
