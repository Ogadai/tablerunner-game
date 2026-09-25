import { GameState, INamedTarget, ITarget, MonsterState, PlayerAction, PlayerActionAttack, PlayerActionCast, PlayerActionMove, PlayerActionType, PlayerActionUseItem } from "@/lib/store/types";
import { BaseParams } from "../base-params";
import { broadcastMessage } from "../game-messages";
import { ProcessRunner } from "../types";
import { LocationMoveDirection, SpellDef, SpellTargetType } from "@/lib/games/types";
import { publishPreloadVideo, publishPlayVideo } from '@/lib/messages/message-videos';
import { VideoNames } from "@/lib/messages/video-list";
import { monsters } from "@/lib/games/monsters";
import { allItems, ConsumableIds, consumableItems, EquipableIds } from "@/lib/games/items";
import { createItemForInventory } from "../apply-inventory";
import { getSpellActionCost, SpellIds, spells } from "@/lib/games/spells";
import { games } from "@/lib/games/games";
import { getLocationsStateFromRedis, getPlayerMessagesFromRedis, setMonsterActionsStateInRedis } from "@/lib/store/redis-access";
import { google } from '@ai-sdk/google';
import { generateText, Output } from 'ai'; // <-- Import Output here
import { z } from 'zod';
import { getMonsterCombatant } from '../monster-combatant';
import { getPlayerActionsPerTurn } from '@/lib/store/playerStats';

const OWNER = 'lich-king';
const LICH_KING_ID = 'lich-king';
const CASTLE_LOCATIONS = [221, 222, 223, 224, 225, 226, 227, 214, 215, 216, 217, 218, 219, 220];
const PRELOAD_LOCATIONS = [228, 184, 181];
const LICH_LOCATION = 224;

interface LichKingDef {
  initiated: boolean;
  gameOver?: boolean;
  lastDirection?: LocationMoveDirection;
}

interface LichActions {
  name: string,
  target?: string,
}

const getState = (gameState: GameState) => 
  ({ ...(gameState.processState[OWNER] || { initiated: false }) as LichKingDef });

const saveState = (gameState: GameState, state: LichKingDef) => {
  gameState.processState[OWNER] = state;
}

const playersPresent = (gameState: GameState): boolean => gameState.players.some(p =>
    CASTLE_LOCATIONS.includes(p.location.id)
  );

const checkInitiate = (params: BaseParams, state: LichKingDef): boolean => {
  if (!state.initiated && playersPresent(params.gameState)) {
    // Activate the boss while keeping its monster identity.
    const monsterDef = monsters['lich'];

    const staff = createItemForInventory(params.gameState, allItems[EquipableIds.staffEarth]);
    const armour = createItemForInventory(params.gameState, allItems[EquipableIds.armourShadow]);
    const helmet = createItemForInventory(params.gameState, allItems[EquipableIds.helmetHorned]);

    const lich: MonsterState = {
      id: LICH_KING_ID,
      type: 'lich',
      location: LICH_LOCATION,
      scriptedActions: true,
      magic: monsterDef.baseStats.magic,
      equipment: [
        staff, armour, helmet,
        createItemForInventory(params.gameState, allItems[ConsumableIds.healingPotion]),
        createItemForInventory(params.gameState, allItems[ConsumableIds.healingPotion]),
        createItemForInventory(params.gameState, allItems[ConsumableIds.healingPotion]),
        createItemForInventory(params.gameState, allItems[ConsumableIds.manaPotion]),
        createItemForInventory(params.gameState, allItems[ConsumableIds.manaPotion]),
      ],
      equipped: { weapon: staff.id, armour: armour.id, helmet: helmet.id },
      health: monsterDef.baseStats.health,
    };

    // Replace the dormant monster with its equipped, active state.
    params.monsters = params.monsters.filter(m => m.id !== LICH_KING_ID);
    params.monsters.push(lich);
        
    publishPlayVideo(params.boardId, params.mapId, VideoNames.lichKingStands);
    return true;
  }
  return false;
}

const checkPreload = (params: BaseParams, state: LichKingDef) => {
  if (!state.initiated && params.gameState.players.some(p =>
    PRELOAD_LOCATIONS.includes(p.location.id)
  )) {
    publishPreloadVideo(params.boardId, params.mapId, VideoNames.lichKingStands);
  }
}

const checkEndGame = (params: BaseParams, state: LichKingDef): boolean => {
  if (state.initiated && !state.gameOver) {
    const lich = params.monsters.find(n => n.id === LICH_KING_ID);

    if (!lich || lich.health === 0) {
      broadcastMessage(params, 'You have defeated the Evil Lich King! Game Over!');
      publishPlayVideo(params.boardId, params.mapId, VideoNames.lichKingDead);
      state.gameOver = true;
    }
  }

  return state.gameOver || false;
}

const describeSpell = (spell: SpellDef): string => {
  if (spell.bonusStats.special) {
    return spell.bonusStats.special;
  } else {
    const effects = Object.keys(spell.bonusStats)
      .filter(k => k !== 'turns')
      .map(k => `${(spell.bonusStats as any)[k]} ${k}`)
      .join(', ');

    return `${effects}${spell.bonusStats.turns ? ` for ${spell.bonusStats.turns} turns` : ''}`;
  }
}

const toGameAction = (action: LichActions, lich: INamedTarget, targets: INamedTarget[], deadMonsters: ITarget[]): PlayerAction | null => {
  const usePotion = (type: ConsumableIds): PlayerActionUseItem | null => {
    const potion = lich.equipment.find(e => e.type === type);
    if (potion) {
      return {
        type: PlayerActionType.UseItem,
        id: 1,
        description: '',
        itemId: potion.id
      };
    }
    return null;
  }

  if (action.name === 'drink healing potion') {
    return usePotion(ConsumableIds.healingPotion);
  } else if (action.name === 'drink mana potion') {
    return usePotion(ConsumableIds.manaPotion);
  } else if (action.name === 'attack') {
    return {
      type: PlayerActionType.Attack,
      id: 1,
      description: '',
      target: action.target || targets[0]?.id,
    } as PlayerActionAttack;
  }

  const getBestDeadMonster = () => deadMonsters.reduce(
    (best: { score: number, target: ITarget | null }, next: ITarget) => {
      const monster = monsters[(next as MonsterState).type];
      const score = monster.baseStats.attack + monster.baseStats.defence + monster.baseStats.damage;
      if (score > best.score) {
        return { score, target: next };
      }
      return best;
    }, { score: 0, target: null }).target;

  const getTarget = (type: SpellTargetType) => ((type === SpellTargetType.corpse)
      ? getBestDeadMonster()?.id : (action.target || targets[0]?.id))

  const spellDetails = lich.spells.map(s => spells[s]);
  for(const spell of spellDetails) {
    if (action.name === `cast ${spell.name}`) {
      return {
        type: PlayerActionType.Cast,
        id: 1,
        spellId: spell.id,
        description: '',
        targetId: spell.pickTarget ? getTarget(spell.targetType) : undefined,
      } as PlayerActionCast;
    }
  }

  if (action.name.startsWith('move ')) {
    const direction = action.name.substring(5);
    return {
      type: PlayerActionType.Move,
      id: 1,
      description: '',
      direction
    } as PlayerActionMove;
  }

  return null;
}

export const lichKing: ProcessRunner = {
  async setup(params: BaseParams): Promise<void> {
    // Create the Lich king
    params.monsters.push({
      id: LICH_KING_ID,
      type: "lich",
      location: LICH_LOCATION,
      health: 30,
      spells: [],
    });

    // Move protection for the Lich King back entrances
    const minotaurLocations = [212, 213, 228];
    params.monsters.push(
      {
        id: "lich-guard-1",
        type: "minotaur",
        location: minotaurLocations[Math.floor(Math.random() * minotaurLocations.length)],
        health: 30,
      },
      {
        id: "lich-guard-2",
        type: "minotaur",
        location: minotaurLocations[Math.floor(Math.random() * minotaurLocations.length)],
        health: 30,
      },
      {
        id: "lich-guard-3",
        type: "ogre",
        location: 181,
        health: 22,
      },
      {
        id: "lich-guard-4",
        type: "ogre",
        location: 181,
        health: 22,
      },
      {
        id: "lich-guard-5",
        type: "skeleton",
        location: 224,
        health: 16,
      },
      {
        id: "lich-guard-6",
        type: "skeleton",
        location: 224,
        health: 16,
      },
    );
  },

  async initialiseForTurn(params: BaseParams) {
    const state = getState(params.gameState);
    if (state.initiated || playersPresent(params.gameState)) {
      // Capture messages for the lich king
      params.messages[LICH_KING_ID] = { messages: []};
    }
  },

  async executeForTurn(params) {
    const state = getState(params.gameState);

    checkPreload(params, state);
    if (checkInitiate(params, state)) {
      state.initiated = true;
    } else if (checkEndGame(params, state)) {
      state.gameOver = true;
    }

    saveState(params.gameState, state);
  },

  async executeBetweenTurns(params: BaseParams): Promise<void> {
    const state = getState(params.gameState);
    if (state.initiated && !state.gameOver && playersPresent(params.gameState)) {
      const gameDef = games.find(g => g.id === params.gameState.gameId)!;

      const [locationsState, messages] = await Promise.all([
        getLocationsStateFromRedis(params.boardId, params.mapId),
        getPlayerMessagesFromRedis(params.boardId, params.mapId, LICH_KING_ID)
      ]);

      const monster = locationsState.monsters.find(m => m.id === LICH_KING_ID);
      if (!monster || monster.health <= 0) return;
      const lich = getMonsterCombatant(monster);

      // Gather the information for the AI
      const locations = gameDef.locations
        .filter(l => CASTLE_LOCATIONS.includes(l.id))
        .map(l => ({
          ...l,
          monsters: locationsState.monsters.filter(m => m.location === l.id),
          heros: [
            ...params.gameState.players.filter(p => p.location.id === l.id),
            ...params.gameState.npcs.filter(n => n.location.id === l.id),
          ]
        }));

      const availableActions: {
        action: string,
        description: string,
        requireTarget: boolean,
        actionCost: number,
        magicCost: number,
      }[] = [];

      if (lich.health < lich.baseStats!.health &&
        !!lich.equipment.find(e => e.type === ConsumableIds.healingPotion)) {
        availableActions.push({
          action: 'drink healing potion',
          description: `Restore ${consumableItems[ConsumableIds.healingPotion].bonusStats!.health} health`,
          requireTarget: false,
          actionCost: consumableItems[ConsumableIds.healingPotion].useCost,
          magicCost: 0,
        });
      }

      if (lich.magic < lich.baseStats!.magic &&
        !!lich.equipment.find(e => e.type === ConsumableIds.manaPotion)) {
        availableActions.push({
          action: 'drink mana potion',
          description: `Restore ${consumableItems[ConsumableIds.manaPotion].bonusStats!.magic} magic`,
          requireTarget: false,
          actionCost: consumableItems[ConsumableIds.manaPotion].useCost,
          magicCost: 0,
        });
      }

      const availableTargets: INamedTarget[] = locations.find(l => l.id === lich.location.id)!.heros.filter(t => t.health > 0);
      const deadMonsters: ITarget[] = locations.find(l => l.id === lich.location.id)!.monsters.filter(m => m.health === 0);
      if (availableTargets.length > 0) {
        availableActions.push({
          action: 'attack',
          description: `Physical attack. Your "attack" vs their "defence", and if you hit up to ${lich.baseStats!.damage} damage`,
          requireTarget: availableTargets.length > 1,
          actionCost: getPlayerActionsPerTurn(lich).attack,
          magicCost: 0,
        });
      }

      const spellDetails = lich.spells.map(s => spells[s]);
      for(const spell of spellDetails) {
        let canCast = availableTargets.length > 0;
        let requireTarget = spell.pickTarget && (availableTargets.length > 1);

        if (spell.id === SpellIds.raiseDead || spell.id === SpellIds.animateCorpse) {
          canCast = false;
          const undead = locations.reduce((counts, l) => {
            const undeadHere = l.monsters.filter(m => m.health > 0 && (m.type === 'skeleton' || m.zombie)).length;
            counts.all += undeadHere;
            if (l.id === lich.location.id) {
              counts.here += undeadHere;
            }
            return counts;
          }, {all: 0, here: 0});

          if (undead.all < 20 && undead.here < 4) {
            if (spell.id === SpellIds.animateCorpse) {
              // Must be dead monsters to cast on
              canCast = deadMonsters.length > 0;
              requireTarget = false;
            } else {
              canCast = true;
            }
          }
        }

        if (spell.id === SpellIds.familiar) {
          canCast = locations
            .find(l => l.id === lich.location.id)!
            .monsters.filter(m => m.health > 0 && m.type === 'skeletaldragon').length === 0;
          requireTarget = false;
        }
        
        if (canCast && lich.magic >= spell.magicCost) {
          availableActions.push({
            action: `cast ${spell.name}`,
            description: describeSpell(spell),
            requireTarget: requireTarget,
            actionCost: getSpellActionCost(spell, lich.baseStats!.magic),
            magicCost: spell.magicCost,
          });
        }
      }

      const currentLocation = locations.find(l => l.id === lich.location.id)!;
      for(const mv of currentLocation?.move.filter(m => CASTLE_LOCATIONS.includes(m.id) && !locationsState.blockedMoves.some(b => b.location === lich.location.id && b.direction === m.direction))) {
        availableActions.push({
            action: `move ${mv.direction}`,
            description: `Move to location ${mv.id} after combat`,
            requireTarget: false,
            actionCost: getPlayerActionsPerTurn(lich).move,
            magicCost: 0,
          });
      }

      const googleModel = process.env.GOOGLE_GENERATIVE_AI_MODEL || 'gemini-3.1-flash-lite';

      const gameInfo = {
        lichKing: lich,
        availableActions,
        availableTargets,
        deadMonsters,
        locations,
        lastTurn: messages,
      };

      try {
        const startTime = performance.now();

        const result = await generateText({
          model: google(googleModel),
          maxRetries: 0,
          abortSignal: AbortSignal.timeout(5000),
          providerOptions: {
            google: {
              serviceTier: 'priority',
              thinkingLevel: 'minimal',
            },
          },
          system: `You are the Evil Lich King, the final boss monster of a fantasy RPG game,
            a necromancer magic user. Your castle is being invaded by heros trying to end your tyrany,
            and it is your task to defeat them. You must choose a set of actions to take for this turn.
            Each action has an "action" cost, and you cannot exceed 20 action points.
            Spells also have a "magic" cost, and you cannot exceed the amount of magic you have left
            (your "magic" will go up by ${Math.ceil(lich.baseStats!.magic * 0.2)} points each turn until your maximum in "baseStats").
            As a necromancer, your best spell is Summon Familiar, but otherwise you favour
            Raise Dead and Animate Corpse spells to build an army of minions.
            If there are no heros at your location, you can choose to do nothing and wait for the heros to come to you,
            or you can move around the castle looking for them.`,
          prompt: `${JSON.stringify(gameInfo)}`,
          
          // Pass the output constraint here instead
          output: Output.object({
            schema: z.object({
              actions: z.array(z.object({
                name: z.string().describe('The name of the action'),
                target: z.string().optional().describe('The id of the target for this action, if "requireTarget" is true'),
              })),
            })
          })
        });

        const endTime = performance.now();
        const actionResponse: { actions: LichActions[] } = result.output;
        console.log(`Lich King actions in ${Math.floor(endTime - startTime)}ms: ${actionResponse.actions.map(a => a.name).join(', ')}`);

        const planningLich = { ...lich, equipment: [...lich.equipment] };
        const monsterActions = actionResponse.actions
          .filter(a => availableActions.some(available => available.action === a.name))
          .map(a => {
            const action = toGameAction(a, planningLich, availableTargets, deadMonsters);
            if (action?.type === PlayerActionType.UseItem) {
              planningLich.equipment = planningLich.equipment.filter(item => item.id !== (action as PlayerActionUseItem).itemId);
            }
            return action;
          });
        await setMonsterActionsStateInRedis(params.boardId, params.mapId, LICH_KING_ID, {
          actions: monsterActions.filter(a => !!a)
        });

      } catch(ex) {
        console.error('Error getting Lich King AI actions', ex);
      }
    }
  }
}
