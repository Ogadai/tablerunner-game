/** @jest-environment node */
import { broadcastMessage, playerMessageAtLocation, soloMessageAtLocation } from './game-messages';
import { createGame, createMonster, createNpc, createParams, createPlayer } from './test-support/fixtures';

it('personalizes repeated placeholders and limits messages to registered nearby recipients', () => {
  const params = createParams({ gameState: createGame({ players: [
    createPlayer({ name: 'James' }), createPlayer({ id: 'ally' }),
    createPlayer({ id: 'away', location: { id: 2, description: '', move: [] } }),
  ] }) });
  playerMessageAtLocation(params, 'hero', '{player} {playerNoun} ready; {player} {ownership} a sword; {player}{possessive} turn');
  expect(params.messages.hero.messages[0].text).toBe('You are ready; You have a sword; Your turn');
  expect(params.messages.ally.messages[0].text).toBe("James is ready; James has a sword; James' turn");
  expect(params.messages.away.messages).toEqual([]);
});

it('supports NPC and monster speakers, explicit origin, and monster recipients', () => {
  const params = createParams({ monsters: [createMonster()] });
  params.gameState.npcs = [createNpc({ name: 'Guide' })];
  params.messages.rat = { messages: [] };
  playerMessageAtLocation(params, 'npc', '{player} speaks');
  playerMessageAtLocation(params, 'rat', '{player} hisses');
  expect(params.messages.hero.messages).toEqual([{ text: 'Guide speaks' }, { text: 'Rat hisses' }]);
  expect(params.messages.rat.messages[1]).toEqual({ text: 'You hisses' });
  params.gameState.players[0].location.id = 2;
  playerMessageAtLocation(params, 'hero', '{player} leaves', 1);
  expect(params.messages.rat.messages[2]).toEqual({ text: 'Test Hero leaves' });
  expect(params.messages.npc).toBeUndefined();
});

it('ignores unknown speakers and safely handles unregistered solo recipients', () => {
  const params = createParams();
  playerMessageAtLocation(params, 'missing', 'ignored');
  soloMessageAtLocation(params, 'missing', 'ignored');
  soloMessageAtLocation(params, 'hero', '{player} {playerNoun} ready');
  broadcastMessage(params, 'A new turn');
  expect(params.messages.hero.messages).toEqual([{ text: 'You are ready' }, { text: 'A new turn' }]);
});
