import { startTransition, useActionState, useEffect, useOptimistic, useRef, useState } from "react";
import { Dialog } from "radix-ui";
import Swal from 'sweetalert2'
import { monsters } from '@/lib/games/monsters';
import { GameState, getDisplayName, getMonsterName, INamedTarget, MonsterState, NPCState, PlayerAction, PlayerActionAttack, PlayerActionReadScroll, PlayerActionsState, PlayerActionType, PlayerActionUseItem, PlayerState } from '@/lib/store/types';
import EntityList, { EntityItemClass, EntityItemDetail } from './entity-list';
import MonsterCard from './monster-card';
import CharacterCard from './character-card';
import { allItems } from "@/lib/games/items";
import { PlayerItem } from "@/lib/games/types";
import LocationItemList from "./location-item-list";
import { takeItemAtLocation } from "@/lib/store/playerInventory";
import { getSwalDefaultOptions } from "@/app/swal";
import styles from './player-location-list.module.css';
import playerStatsSyncService from "./player-stats-sync.service";
import type { PlayerStats } from '@/lib/store/playerTurnStats';
import { getEnemies, isEnemy } from '@/lib/runner/game-friends-or-enemies';

export interface PlayerLocationListProps {
  boardId: string;
  mapId: string;
  player: PlayerState;
  otherPlayers: PlayerState[];
  monsters: MonsterState[];
  npcs: NPCState[];
  entities: EntityItemDetail[],
  items: PlayerItem[];
  onItemTaken: (itemId: string) => void;
  playerStats: PlayerStats;
  actionsState: PlayerActionsState;
  addNewAction: (opts: Omit<PlayerAction, 'id'>) => Promise<void>;
  gameState?: GameState;
  processing?: boolean;
}

interface ItemPickup {
  itemId: string;
  context: string;
  requestId: number;
}

export default function PlayerLocationList({
  boardId,
  mapId,
  player,
  otherPlayers,
  npcs,
  monsters: locationMonsters,
  entities,
  items: locationItems,
  onItemTaken,
  playerStats,
  actionsState,
  addNewAction,
  gameState,
  processing,
}: PlayerLocationListProps) {
  const [monsterOpen, setMonsterOpen] = useState<MonsterState | null>(null);
  const [characterOpen, setCharacterOpen] = useState<PlayerState | null>(null);
  const [npcOpen, setNpcOpen] = useState<NPCState | null>(null);
  const pickupRequest = useRef(0);
  const pendingPickups = useRef(new Set<string>());
  const onItemTakenRef = useRef(onItemTaken);
  const pickupContext = JSON.stringify([boardId, mapId, player.id, player.location.id, gameState?.turn, !!processing, player.health <= 0]);
  const [optimisticItems, removeOptimistically] = useOptimistic(locationItems, (current, pickup: ItemPickup) =>
    pickup.context === pickupContext ? current.filter(item => item.id !== pickup.itemId) : current);

  useEffect(() => {
    onItemTakenRef.current = onItemTaken;
  }, [onItemTaken]);

  useEffect(() => {
    const pending = pendingPickups.current;
    return () => {
      pickupRequest.current += 1;
      pending.clear();
    };
  }, [pickupContext]);

  const [, pickUpItem] = useActionState<null, ItemPickup>(async (previous, pickup) => {
    if (pickup.requestId !== pickupRequest.current) return previous;
    try {
      const response = await takeItemAtLocation(boardId, mapId, player.id, pickup.itemId);
      if (pickup.requestId !== pickupRequest.current) return previous;
      if (response.success && response.data) {
        const inventory = response.data;
        const sourcePlayer = gameState?.players.find(source => source.id === player.id);
        // Show confirmed loot immediately, even while other pickups are still queued.
        if (sourcePlayer) playerStatsSyncService.updateInventory(inventory, sourcePlayer);
        else playerStatsSyncService.updateInventory(inventory);
        onItemTakenRef.current(pickup.itemId);
      }
    } catch {
      // Failed requests restore the item for retry without interrupting other pickups.
    } finally {
      if (pickup.requestId === pickupRequest.current) pendingPickups.current.delete(pickup.itemId);
    }
    return null;
  }, null);
  const openMonster = monsterOpen
    ? locationMonsters.find(monster => monster.id === monsterOpen.id) || monsterOpen
    : null;
  const openCharacter = characterOpen
    ? characterOpen.id === player.id
      ? player
      : otherPlayers.find(otherPlayer => otherPlayer.id === characterOpen.id) || characterOpen
    : null;
  
  const onClickEntity = async (entity: EntityItemDetail) => {
    const monster = locationMonsters.find(m => m.id === entity.id);
    const npc = npcs.find(n => n.id === entity.id);
    if (monster) {
      setMonsterOpen(monster);
    } else if (npc) {
      setNpcOpen(npc);
    } else if (player.id === entity.id) {
      setCharacterOpen(player);
    } else {
      setCharacterOpen(otherPlayers.find(p => p.id === entity.id)!);
    }
  }

  const onAttackMonster = async (monster: MonsterState) => {
    setMonsterOpen(null);

    await addNewAction({
      type: PlayerActionType.Attack,
      description: `Attack ${monsters[monster.type].name}`,
      target: monster.id
    } as Omit<PlayerActionAttack, 'id'>);
  }

  const onUseItem = async (item: PlayerItem) => {
    setCharacterOpen(null);

    await addNewAction({
      type: PlayerActionType.UseItem,
      description: `Use ${allItems[item.type].name}`,
      itemId: item.id
    } as Omit<PlayerActionUseItem, 'id'>);
  }

  const onLearnScroll = async (item: PlayerItem) => {
    setCharacterOpen(null);

    await addNewAction({
      type: PlayerActionType.ReadScroll,
      description: `Learn ${allItems[item.type].name}`,
      itemId: item.id
    } as Omit<PlayerActionReadScroll, 'id'>);
  }

  const onTakeItem = async (itemId: string) => {
    if (processing || pendingPickups.current.has(itemId) || !optimisticItems.some(item => item.id === itemId)) return;
    if (player.health === 0) {
      await Swal.fire({
        ...getSwalDefaultOptions(),
        title: 'Item blocked!',
        icon: 'warning',
        text: "You cannot pick up items while you are dead.",
      });
      return;
    }

    if (getEnemies({ gameState: { players: otherPlayers, npcs }, monsters: locationMonsters }, player).some(target => target.health > 0)) {
      await Swal.fire({
        ...getSwalDefaultOptions(),
        title: 'Item blocked!',
        icon: 'warning',
        text: "You cannot pick up items while there are enemies.",
      });
      return;
    }

    const pickup: ItemPickup = { itemId, context: pickupContext, requestId: pickupRequest.current };
    pendingPickups.current.add(itemId);
    startTransition(() => {
      removeOptimistically(pickup);
      pickUpItem(pickup);
    });
  }

  const dialogOpen = (monsterOpen !== null) || (openCharacter !== null) || (npcOpen !== null);
  
  const dialogTitle =  (monsterOpen !== null) ? getMonsterName(monsterOpen)
    : (npcOpen !== null) ? getDisplayName(npcOpen)
    : (openCharacter !== null) ? getDisplayName(openCharacter) : '';
  const dialogSubTitle = (openCharacter !== null) ? `Level ${openCharacter.level}` : null;

  const displayCharacter: INamedTarget | null = openCharacter || npcOpen;
  const followerNPCs = openCharacter
    ? npcs.filter(npc => npc.masterId === openCharacter.id)
    : [];

  const onCloseDialog = () => {
    setNpcOpen(null);
    setMonsterOpen(null);
    setCharacterOpen(null);
  }

  const onHired = () => {
    setNpcOpen(null);
  };

  const actionPointsLeft = playerStats.actionPointsTotal - playerStats.actionPointsUsed;
  const canAttack = actionPointsLeft >= playerStats.actionsPerTurn.attack;
  const usedItemIds = actionsState.actions
    .filter(a => a.type === PlayerActionType.UseItem ||  a.type === PlayerActionType.ReadScroll)
    .map(a => (a as PlayerActionUseItem).itemId || '');

  const friendlyEntities = entities.filter(e => e.className !== EntityItemClass.enemy);
  const enemyEntities = entities.filter(e => e.className === EntityItemClass.enemy);

  return (<>
    <div className={styles.entityLists}>
      <EntityList entities={friendlyEntities} onClickEntity={onClickEntity} />
      <EntityList entities={enemyEntities} onClickEntity={onClickEntity} />
    </div>

    <LocationItemList items={optimisticItems} onTakeItem={onTakeItem} />

    <Dialog.Root open={dialogOpen} onOpenChange={open => { if (!open) onCloseDialog() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay" />
        <Dialog.Content className="DialogContent">
          <Dialog.Title className="DialogTitle">
            <span>{dialogTitle}</span>
            { dialogSubTitle && <span className="DialogSubTitle">{dialogSubTitle}</span> }
            </Dialog.Title>
          <div className={`${displayCharacter ? styles.dialogContent : ''} DialogContentBody`}>
            { openMonster &&
              <MonsterCard
                key={`${boardId}:${mapId}:${player.id}:${openMonster.id}`}
                monster={openMonster}
                canAttack={canAttack && player.health > 0 && isEnemy(player, openMonster)}
                onAttack={() => onAttackMonster(openMonster)}
              ></MonsterCard>
            }
            { displayCharacter &&
              <CharacterCard
                key={`${boardId}:${mapId}:${displayCharacter.id}`}
                boardId={boardId}
                mapId={mapId}
                player={displayCharacter}
                viewer={player}
                isSelf={displayCharacter.id === player.id}
                actionPointsLeft={actionPointsLeft}
                playerStats={displayCharacter.id === player.id ? playerStats : null}
                onUseItem={onUseItem}
                usedItemIds={usedItemIds}
                onLearnScroll={onLearnScroll}
                onHired={onHired}
                followerNPCs={followerNPCs}
                gameState={gameState}
                processing={processing}
              ></CharacterCard>
            }
          </div>
          <Dialog.Close className="DialogClose btn-secondary material-symbols-outlined" aria-label="Close">close</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </>);
}
