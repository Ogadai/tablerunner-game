import { BaseParams } from './base-params';

export function playerMessageAtLocation(params: BaseParams, playerId: string, message: string) {
  const player = params.gameState.players.find(p => p.id === playerId)!;

  params.messages[playerId].messages.push({
    text: message.replace('{player}', 'You').replace('{playerNoun}', 'are')
  });

  const otherPlayers = params.gameState.players.filter(p => p.id !== playerId && p.location.id === player.location.id);
  for(const otherPlayer of otherPlayers) {
    params.messages[otherPlayer.id].messages.push({
      text: message.replace('{player}', player.name).replace('{playerNoun}', 'is')
    });
  };
}

export function soloMessageAtLocation(params: BaseParams, playerId: string, message: string) {
  const player = params.gameState.players.find(p => p.id === playerId)!;

  params.messages[playerId].messages.push({
    text: message.replace('{player}', 'You').replace('{playerNoun}', 'are')
  });
}
