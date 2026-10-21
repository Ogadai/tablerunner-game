import { NPCState } from '../store/types';
import { SpellIds } from '../games/spells';
import { BaseParams } from './base-params';

const FOLLOWER_SPELLS = new Set<string>([
  SpellIds.spiritGuide, SpellIds.spiritGuarian, SpellIds.spiritWarrior,
  SpellIds.raiseDead, SpellIds.animateCorpse, SpellIds.familiar,
]);

export function isFollowerSpell(spellId: string): boolean {
  return FOLLOWER_SPELLS.has(spellId);
}

export function hasActiveFollower(params: BaseParams, masterId: string): boolean {
  return params.gameState.npcs.some(follower => follower.masterId === masterId
      && follower.health > 0 && (follower.turnsLeft === undefined || follower.turnsLeft > 0))
    || params.monsters.some(follower => follower.masterId === masterId && follower.health > 0);
}

/** Plan and move masters before their followers, regardless of storage order. */
export function getNpcsInMasterOrder(npcs: NPCState[]): NPCState[] {
  const byId = new Map(npcs.map(npc => [npc.id, npc]));
  const visited = new Set<string>();
  const ordered: NPCState[] = [];
  const visit = (npc: NPCState) => {
    if (visited.has(npc.id)) return;
    visited.add(npc.id);
    const master = npc.masterId ? byId.get(npc.masterId) : undefined;
    if (master) visit(master);
    ordered.push(npc);
  };
  npcs.forEach(visit);
  return ordered;
}
