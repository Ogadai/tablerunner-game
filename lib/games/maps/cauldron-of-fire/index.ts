import { cauldronOfFireLocations } from './locations';
import { cauldronOfFireItems } from './items';
import { cauldronOfFireStoreItems } from './stores';
import { cauldronOfFirePortals } from './portals';

import { GameListEntry } from '../../types';
import { characters } from '../../characters';

export { getMonsters } from './monsters';

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
  startLocation: 10,
  locations: cauldronOfFireLocations,
  itemLocations: cauldronOfFireItems,
  storeItems: cauldronOfFireStoreItems,
  portalLocations: cauldronOfFirePortals,
};

