import { monsters } from "../games/monsters";
import { SpellIds } from "../games/spells";
import { BaseStats, MonsterListEntry, SpellDef } from "../games/types";
import { INamedTarget, ITarget, MonsterState, NPCState, PlayerState } from "../store/types";
import { BaseParams } from "./base-params";

export const specialSpellActions: Record<string, (params: BaseParams, player: INamedTarget, spell: SpellDef, targets: ITarget[]) => void> = {
  [SpellIds.spiritGuide]: (params: BaseParams, player: INamedTarget, spell: SpellDef, targets: ITarget[]) =>
      summonSpirit(params, player, monsters['spiriteagle'], 5),
  [SpellIds.spiritGuarian]: (params: BaseParams, player: INamedTarget, spell: SpellDef, targets: ITarget[]) =>
      summonSpirit(params, player, monsters['spiritwolf'], 10),
  [SpellIds.spiritWarrior]: (params: BaseParams, player: INamedTarget, spell: SpellDef, targets: ITarget[]) =>
      summonSpirit(params, player, monsters['spiritbear'], 15),
  [SpellIds.raiseDead]: (params: BaseParams, player: INamedTarget, spell: SpellDef, targets: ITarget[]) =>
      summonSpirit(params, player, monsters['skeleton'], 7, 'dead'),
  [SpellIds.animateCorpse]: (params: BaseParams, player: INamedTarget, spell: SpellDef, targets: ITarget[]) =>
      animateCorpse(params, player, targets, 12),
};

function summonSpirit(params: BaseParams, player: INamedTarget, spirit: MonsterListEntry, turns: number,
    expiryAction: 'remove' | 'dead' | 'monster' = 'remove') {
  removeOtherSupportedNPCs(params, player);

  const masterId = player.alignment === 'evil' ? null : player.id;
  const expiryTurns = player.alignment === 'evil' ? undefined : turns;

  const npcId = `npc-${params.gameState.npcs.length + 1}`;
  const newNPC: NPCState = {
    id: npcId,
    masterId: masterId,
    name: spirit.name,
    location: { id: player.location.id, description: '', move: [] },
    magic: 0,
    spells: [],
    equipment: [],
    equipped: {},
    baseStats: { ...spirit.baseStats },
    hireCost: 0,
    iconXY: spirit.iconXY,
    health: spirit.baseStats.health,
    turnsLeft: expiryTurns,
    expiryAction: expiryAction,
  };

  params.gameState.npcs.push(newNPC);
}

function animateCorpse(params: BaseParams, player: INamedTarget, targets: ITarget[], turns: number, health: number = 10) {
  removeOtherSupportedNPCs(params, player);

  const masterId = player.alignment === 'evil' ? null : player.id;
  const expiryTurns = player.alignment === 'evil' ? undefined : turns;

  for(const target of targets) {
    if ((target as INamedTarget).name) {
      // Animate NPC or player as a zombie
      target.zombie = true;
      target.health = Math.max(health, (target as INamedTarget).baseStats!.health);

      if (!(target as PlayerState).characterStats) {
        // This is an NPC
        const npc = (target as NPCState);
        npc.masterId = masterId;
        npc.turnsLeft = expiryTurns;
        npc.expiryAction = 'monster';
        npc.monsterType = 'zombie';
      }
    } else {
      // Turn a monster corpse into a zombie NPC
      const monsterDef = monsters[(target as MonsterState).type];

      const newNPC: NPCState = {
        id: target.id,
        masterId: masterId,
        name: monsterDef.name,
        location: { id: player.location.id, description: '', move: [] },
        magic: 0,
        spells: [],
        equipment: [],
        equipped: {},
        baseStats: {  ...monsterDef.baseStats },
        hireCost: 0,
        iconXY: monsterDef.iconXY,
        health: Math.min(health, monsterDef.baseStats.health),
        turnsLeft: expiryTurns,
        expiryAction: 'monster',
        monsterType: monsterDef.id,
        zombie: true,
      };

      // remove the monster and add the npc
      params.monsters = params.monsters.filter(m => m.id !== target.id);
      params.gameState.npcs.push(newNPC);
    }
  }
}

function removeOtherSupportedNPCs(params: BaseParams, player: INamedTarget) {
  params.gameState.npcs.map(npc => {
    if (npc.masterId === player.id && npc.turnsLeft && npc.turnsLeft > 1) {
      // Expire this one
      npc.turnsLeft = 1;
    }
  });
}
