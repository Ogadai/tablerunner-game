import { useState } from "react";
import { Dialog } from "radix-ui";
import Swal from 'sweetalert2'
import { monsters } from '@/lib/games/monsters';
import { MonsterState, PlayerAction, PlayerActionAttack, PlayerActionReadScroll, PlayerActionsState, PlayerActionType, PlayerActionUseItem, PlayerState } from '@/lib/store/types';
import EntityList, { EntityItemDetail, EntityItemClass } from './entity-list';
import MonsterCard from './monster-card';
import CharacterCard from './character-card';
import { allItems } from "@/lib/games/items";
import { PlayerItem } from "@/lib/games/types";
import LocationItemList from "./location-item-list";
import { takeItemAtLocation } from "@/lib/store/playerInventory";
import { getSwalDefaultOptions } from "@/app/swal";
import styles from './player-location-list.module.css';
import playerStatsSyncService, { PlayerStats } from "./player-stats-sync.service";

export interface PlayerLocationListProps {
  boardId: string;
  mapId: string;
  player: PlayerState;
  otherPlayers: PlayerState[];
  monsters: MonsterState[];
  entities: EntityItemDetail[],
  items: PlayerItem[];
  playerStats: PlayerStats;
  actionsState: PlayerActionsState;
  addNewAction: (opts: Omit<PlayerAction, 'id'>) => Promise<void>;
}

export default function PlayerLocationList({
  boardId,
  mapId,
  player,
  otherPlayers,
  monsters: locationMonsters,
  entities,
  items: locationItems,
  playerStats,
  actionsState,
  addNewAction
}: PlayerLocationListProps) {
  const [monsterOpen, setMonsterOpen] = useState<MonsterState | null>(null);
  const [characterOpen, setCharacterOpen] = useState<PlayerState | null>(null);
  const openCharacter = characterOpen
    ? characterOpen.id === player.id
      ? player
      : otherPlayers.find(otherPlayer => otherPlayer.id === characterOpen.id) || characterOpen
    : null;
  
  const onClickEntity = async (entity: EntityItemDetail) => {
    if (entity.className === EntityItemClass.enemy) {
      const monster = locationMonsters.find(m => m.id === entity.id)!;
      setMonsterOpen(monster);
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
    if (player.health === 0) {
      await Swal.fire({
        ...getSwalDefaultOptions(),
        title: 'Item blocked!',
        icon: 'warning',
        text: "You cannot pick up items while you are dead.",
      });
      return;
    }

    if (locationMonsters.some(monster => monster.health > 0)) {
      await Swal.fire({
        ...getSwalDefaultOptions(),
        title: 'Item blocked!',
        icon: 'warning',
        text: "You cannot pick up items while there are enemies.",
      });
      return;
    }

    const response = await takeItemAtLocation(boardId, mapId, player.id, itemId);
    playerStatsSyncService.updateInventory(response.data);
  }

  const dialogOpen = (monsterOpen !== null) || (openCharacter !== null);
  
  const dialogTitle =  (monsterOpen !== null)
    ? monsters[monsterOpen.type].name
    : (openCharacter !== null) ? openCharacter.name : '';
  const dialogSubTitle = (openCharacter !== null) ? `Level ${openCharacter.level}` : null;

  const onCloseDialog = () => {
    setMonsterOpen(null);
    setCharacterOpen(null);
  }

  const actionPointsLeft = playerStats.actionPointsTotal - playerStats.actionPointsUsed;
  const canAttack = actionPointsLeft >= playerStats.actionsPerTurn.attack;
  const usedItemIds = actionsState.actions
    .filter(a => a.type === PlayerActionType.UseItem)
    .map(a => (a as PlayerActionUseItem).itemId || '');

  return (<>
    <EntityList entities={entities} onClickEntity={onClickEntity} />

    <LocationItemList items={locationItems} onTakeItem={onTakeItem} />

    <Dialog.Root open={dialogOpen} onOpenChange={open => { if (!open) onCloseDialog() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay" />
        <Dialog.Content className="DialogContent">
          <Dialog.Title className="DialogTitle">
            <span>{dialogTitle}</span>
            { dialogSubTitle && <span className="DialogSubTitle">{dialogSubTitle}</span> }
            </Dialog.Title>
          <div className={`${openCharacter ? styles.dialogContent : ''} DialogContentBody`}>
            { monsterOpen &&
              <MonsterCard
                monster={monsterOpen}
                canAttack={canAttack}
                onAttack={() => onAttackMonster(monsterOpen)}
              ></MonsterCard>
            }
            { openCharacter &&
              <CharacterCard
                boardId={boardId}
                mapId={mapId}
                player={openCharacter}
                isSelf={openCharacter.id === player.id}
                actionPointsLeft={actionPointsLeft}
                playerStats={openCharacter.id === player.id ? playerStats : null}
                onUseItem={onUseItem}
                usedItemIds={usedItemIds}
                onLearnScroll={onLearnScroll}
              ></CharacterCard>
            }
          </div>
          <Dialog.Close className="DialogClose btn-secondary material-symbols-outlined" aria-label="Close">close</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </>);
}
