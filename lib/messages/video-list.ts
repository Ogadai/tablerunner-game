import { getResourceRootUrl } from "../services/location-images";

export enum VideoNames {
  dragonWakes = 'dragon-wakes',
  juvenileDragon = 'juvenile-dragon',
  lichKingStands = 'lich-king-stands',
  lichKingDead = 'lich-king-dead',
  fireCrystalShardFound1 = 'fire-crystal-shard-found1',
  fireCrystalShardFound2 = 'fire-crystal-shard-found2',
  fireCrystalShardFound3 = 'fire-crystal-shard-found3',
  fireCrystalShardWin = 'fire-crystal-shard-win',
  barbarianWins = 'barbarian-wins',
  witchWins = 'witch-wins',
  rangerWins = 'ranger-wins',
  mageWins = 'mage-wins',
  barbarianWarlordsWin = 'barbarian-warlords-win',
  witchWarlordsWin = 'witch-warlords-win',
  rangerWarlordsWin = 'ranger-warlords-win',
  mageWarlordsWin = 'mage-warlords-win',
  warlordsDefeat = 'warlords-defeat',
}

const videoBaseUrl = getResourceRootUrl();

export const videoList: { [id: string]: string } = {
  'dragon-wakes': `${videoBaseUrl}/dragon-wakes.mp4`,
  'juvenile-dragon': `${videoBaseUrl}/juvenile-dragon.mp4`,
  'lich-king-stands': `${videoBaseUrl}/lich-king-stand.mp4`,
  'lich-king-dead': `${videoBaseUrl}/lich-king-dead.mp4`,
  'fire-crystal-shard-found1': `${videoBaseUrl}/fire-crystal-shard-found-1.mp4`,
  'fire-crystal-shard-found2': `${videoBaseUrl}/fire-crystal-shard-found.mp4`,
  'fire-crystal-shard-found3': `${videoBaseUrl}/fire-crystal-shard-found-3.mp4`,
  'fire-crystal-shard-win': `${videoBaseUrl}/fire-crystal-shard-win.mp4`,
  'barbarian-wins': `${videoBaseUrl}/barbarian-wins.mp4`,
  'witch-wins': `${videoBaseUrl}/witch-wins.mp4`,
  'ranger-wins': `${videoBaseUrl}/ranger-wins.mp4`,
  'mage-wins': `${videoBaseUrl}/mage-wins.mp4`,
  'barbarian-warlords-win': `${videoBaseUrl}/barbarian-warlords-win.mp4`,
  'witch-warlords-win': `${videoBaseUrl}/witch-warlords-win.mp4`,
  'ranger-warlords-win': `${videoBaseUrl}/ranger-warlords-win.mp4`,
  'mage-warlords-win': `${videoBaseUrl}/mage-warlords-win.mp4`,
  'warlords-defeat': `${videoBaseUrl}/warlords-defeat.mp4`,
};
