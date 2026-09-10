import { getDisplayName } from '../store/types';
import { BaseParams } from './base-params';

export function playerMessageAtLocation(params: BaseParams, playerId: string, message: string) {
  const player = params.gameState.players.find(p => p.id === playerId)!;

  params.messages[playerId].messages.push({
    text: message
      .replace('{player}', 'You')
      .replace('{playerNoun}', 'are')
      .replace('{possessive}', 'r')
  });

  const playerName = getDisplayName(player);
  const otherPlayers = params.gameState.players.filter(p => p.id !== playerId && p.location.id === player.location.id);
  for(const otherPlayer of otherPlayers) {
    params.messages[otherPlayer.id].messages.push({
      text: message
        .replace('{player}', playerName)
        .replace('{playerNoun}', 'is')
        .replace('{possessive}', playerName.endsWith('s') ? `'` : `'s`)
    });
  };
}

export function soloMessageAtLocation(params: BaseParams, playerId: string, message: string) {
  params.messages[playerId].messages.push({
    text: message.replace('{player}', 'You').replace('{playerNoun}', 'are')
  });
}

export function broadcastMessage(params: BaseParams, message: string) {
  for(const player of params.gameState.players) {
    params.messages[player.id].messages.push({
      text: message
    });
  }
}