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
};
