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
  description: 'Explore the lands of the volcano and defeat the evil Lich King.',
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
  gameTips: [
    {
      turn: 1,
      markDownMessage: 'Try to travel *North* to the village at **91** where there are shops.'
    },
    {
      turn: 2,
      markDownMessage: 'Monsters are more dangerous away from roads, further north and underground.'
    },
    {
      turn: 4,
      markDownMessage: 'You need to have a strong party. Stick together or hire an NPC at the shops.'
    },
    {
      turn: 6,
      markDownMessage: 'You can sell your Resurrection Stone to get Coins to hire an NPC or buy equipment.'
    }
  ]
};

