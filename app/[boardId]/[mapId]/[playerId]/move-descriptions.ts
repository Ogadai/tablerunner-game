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