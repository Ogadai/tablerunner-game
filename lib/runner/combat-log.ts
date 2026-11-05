import {
  BattleReplay,
  CombatActionIcon,
  CombatActionType,
  CombatEvent,
  CombatEventTarget,
  EntityItemClass,
  EntityItemDetail,
  GameState,
  getMonsterName,
  INamedTarget,
  ITarget,
  MonsterState,
} from '../store/types';
import { BaseParams } from './base-params';
import { characters } from '../games/characters';
import { monsters } from '../games/monsters';
import { getCombatStats } from '../store/playerStats';
import { allItems } from '../games/items';
import { EquipableItemDef, ConsumableItemDef, SpellDef } from '../games/types';
import { SpellIds, spells } from '../games/spells';
import { isEnemy, isFriend } from './game-friends-or-enemies';

export interface CombatParticipant {
  id: string;
  name: string;
  iconXY: { x: number; y: number };
  health: number;
  maxHealth: number;
  isMonster?: boolean;
  monsterType?: string;
  team?: string | null;
  masterId?: string | null;
}

export interface CombatLocationLog {
  initialParticipants: CombatParticipant[];
  events: CombatEvent[];
}

export interface CombatSpellTargetInput {
  target: INamedTarget | MonsterState;
  healthDelta: number;
  resultHealth: number;
  miss?: boolean;
  defeated?: boolean;
  resisted?: boolean;
  vulnerable?: boolean;
}

export interface CombatItemTargetInput {
  target: INamedTarget | MonsterState;
  healthDelta: number;
  resultHealth: number;
}

export function getTargetLocationId(target: ITarget): number | undefined {
  if ('location' in target) {
    const targetWithLocation = target as { location: number | { id: number } };
    if (typeof targetWithLocation.location === 'number') {
      return targetWithLocation.location;
    }
    if (targetWithLocation.location && typeof targetWithLocation.location.id === 'number') {
      return targetWithLocation.location.id;
    }
  }
  return undefined;
}

export function getAttackActionIcon(attacker: INamedTarget): CombatActionIcon {
  const weaponId = attacker.equipped?.weapon;
  const weapon = weaponId ? attacker.equipment?.find(e => e.id === weaponId) : undefined;
  const weaponItem = weapon ? (allItems[weapon.type] as EquipableItemDef) : undefined;
  const isRanged = !!weaponItem?.ranged;
  return {
    sheet: 'spell',
    iconXY: isRanged ? { x: 0, y: 5 } : { x: 6, y: 4 },
  };
}

export function getSpellActionIcon(spell: SpellDef): CombatActionIcon {
  return {
    sheet: 'spell',
    iconXY: spell.iconXY,
  };
}

export function getItemActionIcon(item: ConsumableItemDef): CombatActionIcon {
  return {
    sheet: 'item',
    iconXY: item.iconXY,
  };
}

export function getEffectActionIcon(description: string): CombatActionIcon {
  const desc = description.toLowerCase();
  if (desc.includes('poison') || desc.includes('venom')) {
    return { sheet: 'spell', iconXY: spells[SpellIds.poisonCloud]?.iconXY || { x: 5, y: 3 } };
  }
  if (desc.includes('burn') || desc.includes('fire')) {
    return { sheet: 'spell', iconXY: spells[SpellIds.fireBall]?.iconXY || { x: 0, y: 0 } };
  }
  if (desc.includes('ice') || desc.includes('blizzard') || desc.includes('frost')) {
    return { sheet: 'spell', iconXY: spells[SpellIds.iceStorm]?.iconXY || { x: 1, y: 0 } };
  }
  if (desc.includes('lightning') || desc.includes('shock') || desc.includes('spark')) {
    return { sheet: 'spell', iconXY: spells[SpellIds.lightning]?.iconXY || { x: 4, y: 0 } };
  }
  return { sheet: 'spell', iconXY: { x: 6, y: 4 } };
}

function ensureParticipant(
  log: CombatLocationLog,
  entity: INamedTarget | MonsterState,
  preActionHealth?: number
): void {
  if (log.initialParticipants.some(p => p.id === entity.id)) {
    return;
  }

  if ('type' in entity) {
    const mon = entity as MonsterState;
    const monDef = monsters[mon.type];
    log.initialParticipants.push({
      id: mon.id,
      name: getMonsterName(mon),
      iconXY: monDef?.iconXY || { x: 0, y: 0 },
      health: preActionHealth ?? mon.health,
      maxHealth: monDef?.baseStats?.health || mon.health,
      isMonster: true,
      monsterType: mon.type,
      team: mon.team,
      masterId: mon.masterId,
    });
  } else {
    const target = entity as INamedTarget;
    const charIcon = characters[target.id]?.iconXY
      || ('iconXY' in target ? (target as unknown as { iconXY: { x: number; y: number } }).iconXY : undefined)
      || { x: 0, y: 0 };
    const maxHp = target.baseStats ? getCombatStats(target).health : target.health;
    const masterId = 'masterId' in target ? (target as unknown as { masterId: string | null }).masterId : undefined;
    log.initialParticipants.push({
      id: target.id,
      name: target.name,
      iconXY: charIcon,
      health: preActionHealth ?? target.health,
      maxHealth: maxHp,
      team: target.team,
      masterId,
    });
  }
}

export function snapshotPreCombatParticipants(params: BaseParams): void {
  params.combatLogs ??= {};

  const locationIds = new Set<number>();
  for (const player of params.gameState.players) {
    locationIds.add(player.location.id);
  }
  for (const npc of params.gameState.npcs) {
    locationIds.add(npc.location.id);
  }
  for (const monster of params.monsters) {
    locationIds.add(monster.location);
  }

  for (const locId of locationIds) {
    initCombatLocation(params, locId);
  }
}

export function initCombatLocation(params: BaseParams, locationId: number): CombatLocationLog {
  params.combatLogs ??= {};
  if (params.combatLogs[locationId]) {
    return params.combatLogs[locationId];
  }

  const participants: CombatParticipant[] = [];

  for (const player of params.gameState.players) {
    if (player.location.id === locationId) {
      participants.push({
        id: player.id,
        name: player.name,
        iconXY: characters[player.id]?.iconXY || { x: 0, y: 0 },
        health: player.health,
        maxHealth: player.baseStats ? getCombatStats(player).health : player.health,
        team: player.team,
      });
    }
  }

  for (const npc of params.gameState.npcs) {
    if (npc.location.id === locationId) {
      participants.push({
        id: npc.id,
        name: npc.name,
        iconXY: npc.iconXY || { x: 0, y: 0 },
        health: npc.health,
        maxHealth: npc.baseStats ? getCombatStats(npc).health : npc.health,
        team: npc.team,
        masterId: npc.masterId,
      });
    }
  }

  for (const monster of params.monsters) {
    if (monster.location === locationId) {
      const monDef = monsters[monster.type];
      participants.push({
        id: monster.id,
        name: getMonsterName(monster),
        iconXY: monDef?.iconXY || { x: 0, y: 0 },
        health: monster.health,
        maxHealth: monDef?.baseStats?.health || monster.health,
        isMonster: true,
        monsterType: monster.type,
        team: monster.team,
        masterId: monster.masterId,
      });
    }
  }

  const log: CombatLocationLog = {
    initialParticipants: participants,
    events: [],
  };
  params.combatLogs[locationId] = log;
  return log;
}

export function recordCombatAttack(
  params: BaseParams,
  locationId: number,
  attacker: INamedTarget,
  target: INamedTarget | MonsterState,
  damage: number,
  resultHealth: number,
  hit: boolean,
  options?: {
    attackName?: string;
    resisted?: boolean;
    vulnerable?: boolean;
    defeated?: boolean;
  }
): void {
  const log = initCombatLocation(params, locationId);
  ensureParticipant(log, attacker);
  ensureParticipant(log, target, resultHealth + (hit ? damage : 0));

  const targetName = 'type' in target ? getMonsterName(target as MonsterState) : (target as INamedTarget).name;
  const icon = getAttackActionIcon(attacker);

  const eventTarget: CombatEventTarget = {
    targetId: target.id,
    targetName,
    healthDelta: hit ? -damage : 0,
    resultHealth,
    miss: !hit,
    defeated: options?.defeated ?? (hit && resultHealth <= 0),
    resisted: options?.resisted,
    vulnerable: options?.vulnerable,
  };

  log.events.push({
    id: `combat-${locationId}-${log.events.length + 1}`,
    initiatorId: attacker.id,
    initiatorName: attacker.name,
    actionType: 'attack',
    actionName: options?.attackName || 'Attack',
    icon,
    targets: [eventTarget],
  });
}

export function recordCombatSpell(
  params: BaseParams,
  locationId: number,
  caster: INamedTarget,
  spell: SpellDef,
  targets: CombatSpellTargetInput[]
): void {
  if (targets.length === 0) return;

  const log = initCombatLocation(params, locationId);
  ensureParticipant(log, caster);

  const eventTargets: CombatEventTarget[] = targets.map(t => {
    ensureParticipant(log, t.target, t.resultHealth - t.healthDelta);
    const targetName = 'type' in t.target
      ? getMonsterName(t.target as MonsterState)
      : (t.target as INamedTarget).name;

    return {
      targetId: t.target.id,
      targetName,
      healthDelta: t.healthDelta,
      resultHealth: t.resultHealth,
      miss: t.miss,
      defeated: t.defeated ?? (t.healthDelta < 0 && t.resultHealth <= 0),
      resisted: t.resisted,
      vulnerable: t.vulnerable,
    };
  });

  log.events.push({
    id: `combat-${locationId}-${log.events.length + 1}`,
    initiatorId: caster.id,
    initiatorName: caster.name,
    actionType: 'spell',
    actionName: spell.name,
    icon: getSpellActionIcon(spell),
    targets: eventTargets,
  });
}

export function recordCombatItem(
  params: BaseParams,
  locationId: number,
  user: INamedTarget,
  item: ConsumableItemDef,
  targets: CombatItemTargetInput[]
): void {
  if (targets.length === 0) return;

  const log = initCombatLocation(params, locationId);
  ensureParticipant(log, user);

  const eventTargets: CombatEventTarget[] = targets.map(t => {
    ensureParticipant(log, t.target, t.resultHealth - t.healthDelta);
    const targetName = 'type' in t.target
      ? getMonsterName(t.target as MonsterState)
      : (t.target as INamedTarget).name;

    return {
      targetId: t.target.id,
      targetName,
      healthDelta: t.healthDelta,
      resultHealth: t.resultHealth,
      defeated: false,
    };
  });

  log.events.push({
    id: `combat-${locationId}-${log.events.length + 1}`,
    initiatorId: user.id,
    initiatorName: user.name,
    actionType: 'item',
    actionName: item.name,
    icon: getItemActionIcon(item),
    targets: eventTargets,
  });
}

export function recordCombatEffect(
  params: BaseParams,
  locationId: number,
  target: INamedTarget | MonsterState,
  effectName: string,
  damage: number,
  resultHealth: number,
  defeated?: boolean
): void {
  const log = initCombatLocation(params, locationId);
  ensureParticipant(log, target, resultHealth + damage);

  const targetName = 'type' in target
    ? getMonsterName(target as MonsterState)
    : (target as INamedTarget).name;

  log.events.push({
    id: `combat-${locationId}-${log.events.length + 1}`,
    initiatorId: 'effect',
    initiatorName: effectName,
    actionType: 'effect',
    actionName: effectName,
    icon: getEffectActionIcon(effectName),
    targets: [{
      targetId: target.id,
      targetName,
      healthDelta: -damage,
      resultHealth,
      defeated: defeated ?? (resultHealth <= 0),
    }],
  });
}

const COMBAT_MESSAGE_PATTERNS = [
  /\bhit\b.*?\bfor\b.*?\bdamage\b/i,
  /\bmissed\b/i,
  /\bhealed\b.*?\bfor\b.*?\bhealth\b/i,
  /\btook\b.*?\bdamage from\b/i,
  /\bdrank\b.*?\bfor\b/i,
  /\bdead\b/i,
  /\bdefeated\b/i,
  /\bcast\b.*?\bon\b/i,
  /\bused\b.*?\bon\b/i,
];

export function isCombatMessage(text: string): boolean {
  return COMBAT_MESSAGE_PATTERNS.some(pattern => pattern.test(text));
}

export function isActualBattle(replay?: BattleReplay): boolean {
  if (!replay || !replay.events || replay.events.length === 0) {
    return false;
  }

  const enemyIds = new Set(
    replay.initialEntities
      ?.filter(e => e.className === EntityItemClass.enemy)
      .map(e => e.id) ?? []
  );

  return replay.events.some(event => {
    if (event.actionType === 'attack') {
      return true;
    }
    if (enemyIds.has(event.initiatorId)) {
      return true;
    }
    if (event.targets?.some(t => enemyIds.has(t.targetId))) {
      return true;
    }
    return false;
  });
}

export function finalizeCombatReplays(params: BaseParams): void {
  if (!params.combatLogs) return;

  for (const player of params.gameState.players) {
    const combatLocationId = params.playerCombatLocations?.[player.id] ?? player.location.id;
    const log = params.combatLogs[combatLocationId];
    if (!log || log.events.length === 0) continue;

    const initialEntities: EntityItemDetail[] = log.initialParticipants.map(participant => {
      let className: EntityItemClass;
      if (participant.id === player.id) {
        className = EntityItemClass.self;
      } else if (isEnemy(player, participant as ITarget)) {
        className = EntityItemClass.enemy;
      } else if (isFriend(player, participant as ITarget)) {
        className = EntityItemClass.friendly;
      } else {
        className = EntityItemClass.npc;
      }

      return {
        id: participant.id,
        name: participant.name,
        iconXY: participant.iconXY,
        className,
        health: participant.health,
        maxHealth: participant.maxHealth,
      };
    });

    params.messages[player.id] ??= { messages: [] };
    params.messages[player.id].battleReplay = {
      locationId: combatLocationId,
      initialEntities,
      events: log.events,
    };
  }
}
