import { useState, useEffect } from "react";
import { Dialog } from "radix-ui";
import Swal from 'sweetalert2'
import { monsters } from '@/lib/games/monsters';
import { characters } from '@/lib/games/characters';
import { MonsterState, PlayerAction, PlayerActionAttack, PlayerActionsState, PlayerActionType, PlayerActionUseItem, PlayerState } from '@/lib/store/types';
import EntityList, { EntityItemDetail, EntityItemClass } from './entity-list';
import MonsterCard from './monster-card';
import CharacterCard from './character-card';
import { PlayerActionsPerTurn } from "@/lib/store/playerStats";
import { allItems } from "@/lib/games/items";
import { PlayerItem } from "@/lib/games/types";
import LocationItemList from "./location-item-list";
import { takeItemAtLocation } from "@/lib/store/playerInventory";
import { getSwalDefaultOptions } from "@/app/swal";

export interface PlayerLocationListProps {
  boardId: string;
  mapId: string;
  player: PlayerState;
  otherPlayers: PlayerState[];
  monsters: MonsterState[];
  entities: EntityItemDetail[],
  items: PlayerItem[];
  actionsState: PlayerActionsState;
  actionsPerTurn: PlayerActionsPerTurn;
  actionPointsLeft: number;
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
  actionsState,
  actionsPerTurn,
  actionPointsLeft,
  addNewAction
}: PlayerLocationListProps) {
  const [monsterOpen, setMonsterOpen] = useState<MonsterState | null>(null);
  const [characterOpen, setCharacterOpen] = useState<PlayerState | null>(null);

  useEffect(() => {
    // Listen for the custom Swal signal
    window.addEventListener('close-active-radix-dialogs', onCloseDialog);
    return () => {
      window.removeEventListener('close-active-radix-dialogs', onCloseDialog);
    };
  });

  useEffect(() => {
    if (player.availableStats > 0) {
      setCharacterOpen(player);
    }
  }, [player]);
  
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

    await takeItemAtLocation(boardId, mapId, player.id, itemId);
  }

  const dialogOpen = (monsterOpen !== null) || (characterOpen !== null);
  
  const dialogTitle =  (monsterOpen !== null)
    ? monsters[monsterOpen.type].name
    : (characterOpen !== null) ? characterOpen.name : '';
  const dialogSubTitle = (characterOpen !== null) ? `Level ${characterOpen.level}` : null;

  const onCloseDialog = () => {
    setMonsterOpen(null);
    setCharacterOpen(null);
  }

  // TODO: Can't attack or use items if dead!

  const canAttack = actionPointsLeft >= actionsPerTurn.attack;
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
          <div className="DialogContentBody">
            { monsterOpen &&
              <MonsterCard
                monster={monsterOpen}
                canAttack={canAttack}
                onAttack={() => onAttackMonster(monsterOpen)}
              ></MonsterCard>
            }
            { characterOpen &&
              <CharacterCard
                boardId={boardId}
                mapId={mapId}
                player={characterOpen}
                isSelf={characterOpen.id === player.id}
                actionPointsLeft={actionPointsLeft}
                onUseItem={onUseItem}
                usedItemIds={usedItemIds}
              ></CharacterCard>
            }
          </div>
          <Dialog.Close className="DialogClose btn-secondary material-symbols-outlined" aria-label="Close">close</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </>);
}
