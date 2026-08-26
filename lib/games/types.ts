export interface GameListEntry {
  map: string;
  id: string;
  name: string;
  description: string;
  heroImage: string;
  characters: CharacterListEntry[];
}

export interface CharacterListEntry {
  id: string;
  prompt: string;
  defaultName: string;
  description: string;
}
