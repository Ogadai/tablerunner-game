import { sharedLocations } from '../shared-locations';
import { cauldronOfFireItems } from './items';
import { cauldronOfFireStoreItems } from './stores';
import { cauldronOfFirePortals } from './portals';

import { GameListEntry } from '../../types';
import { characters } from '../../characters';

export const cauldronOfFire: GameListEntry = {
  id: 'cauldronfire',
  name: 'Cauldron of Fire',
  map: 'cauldron',
  description: 'Explore the lands of the volcano and defeat the evil king.',
  heroImage: '/hero-barbarian-witch.png',
  characters: [
    { ...characters.barbarian },
    { ...characters.witch },
    { ...characters.mage },
    { ...characters.ranger }
  ],
  locations: sharedLocations,
  itemLocations: cauldronOfFireItems,
  storeItems: cauldronOfFireStoreItems,
  portalLocations: cauldronOfFirePortals,
};

