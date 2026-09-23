import { getDisplayName } from '../store/types';
import { BaseParams } from './base-params';
import { getMonsterCombatant } from './monster-combatant';

export function playerMessageAtLocation(params: BaseParams, playerId: string, message: string, fromLocation?: number) {
  const monster = params.monsters.find(m => m.id === playerId);
  const actor = params.gameState.players.find(p => p.id === playerId)
    || params.gameState.npcs.find(p => p.id === playerId)
    || (monster ? getMonsterCombatant(monster) : undefined);
  if (!actor) return;

  const name = getDisplayName(actor);
  const location = fromLocation ?? actor.location.id;
  // Only explicitly registered recipients receive logs. The Lich registers his own.
  for (const [recipientId, buffer] of Object.entries(params.messages)) {
    const recipient = params.gameState.players.find(p => p.id === recipientId)
      || params.gameState.npcs.find(p => p.id === recipientId);
    const recipientLocation = recipient?.location.id
      ?? params.monsters.find(m => m.id === recipientId)?.location;
    if (recipientId !== playerId && recipientLocation !== location) continue;
    const self = recipientId === playerId;
    buffer.messages.push({ text: message
      .replaceAll('{player}', self ? 'You' : name)
      .replaceAll('{playerNoun}', self ? 'are' : 'is')
      .replaceAll('{ownership}', self ? 'have' : 'has')
      .replaceAll('{possessive}', self ? 'r' : name.endsWith('s') ? "'" : "'s")
    });
  }
}

export function soloMessageAtLocation(params: BaseParams, playerId: string, message: string) {
  params.messages[playerId]?.messages.push({
    text: message.replaceAll('{player}', 'You').replaceAll('{playerNoun}', 'are')
  });
}

export function broadcastMessage(params: BaseParams, message: string) {
  for (const buffer of Object.values(params.messages)) {
    buffer.messages.push({ text: message });
  }
}
