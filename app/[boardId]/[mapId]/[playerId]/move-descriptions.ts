import { LocationMoveDirection } from "@/lib/games/types";

export const moveDescriptions: Record<LocationMoveDirection, string> = {
  ['n']: 'Go North',
  ['ne']: 'Go North East',
  ['e']: 'Go East',
  ['se']: 'Go South East',
  ['s']: 'Go South',
  ['sw']: 'Go South West',
  ['w']: 'Go West',
  ['nw']: 'Go North West',
};

export const moveLabels: Record<LocationMoveDirection, string> = {
  ['n']: 'north',
  ['ne']: 'north_east',
  ['e']: 'east',
  ['se']: 'south_east',
  ['s']: 'south',
  ['sw']: 'south_west',
  ['w']: 'west',
  ['nw']: 'north_west',
};

export const moveLabelOrder: Record<LocationMoveDirection, number> = {
  ['n']: 0,
  ['ne']: 1,
  ['e']: 2,
  ['se']: 3,
  ['s']: 4,
  ['sw']: 5,
  ['w']: 6,
  ['nw']: 7,
};
