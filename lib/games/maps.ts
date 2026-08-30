import { Location } from './types';

export const cauldronOfFire: Location[] = Array.from({ length: 240 }, (_, i) => ({
  id: i + 1,
  description: '',
  move: [],
}));

cauldronOfFire[9].description = 'The road North leads through a wooden gate. There are tracks leading East and West.';
